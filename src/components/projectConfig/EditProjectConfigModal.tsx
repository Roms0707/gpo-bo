import React, { useState, useEffect } from 'react';
import { Edit, ArrowLeft, ArrowRight, Mail, MessageCircle, Phone, Info, AlertTriangle as AlertTriangleIcon, X, Globe, FileText, ChevronDown, ChevronRight } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import ColorPickerInput from '../ui/ColorPickerInput';
import FileUploadInput from '../ui/FileUploadInput';
import Checkbox from '../ui/Checkbox';
import ConfirmationModal from '../ui/ConfirmationModal';
import toast from 'react-hot-toast';
import WizardStepIndicator from './WizardStepIndicator';
import {
  updateProjectConfiguration,
  uploadFile,
  validateHexColor,
  ProjectConfiguration,
  checkDomainAvailability,
  validateEmail,
  areColorsSimilar,
  validateDiscordUrl,
  validateOtpSmsTemplate,
  AuthMethod,
  KlientoAuthType,
  LegalMode,
  DEFAULT_OTP_SMS_TEMPLATE,
  OTP_SMS_TEMPLATE_MAX_LENGTH,
  validateLegalUrl,
} from '../../services/projectConfigService';
import { validateDomainFormat, normalizeDomain } from '../../utils/domainValidation';
import { CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react';
import { LegalVariablesPreview } from './LegalVariablesPreview';
import SearchableCountrySelect from '../ui/SearchableCountrySelect';
import { isValidCountryIsoFromAll, getDialCodeNumeric } from '../../data/allCountries';

const AUTH_METHOD_OPTIONS: { value: AuthMethod; label: string; description: string; icon: React.ReactNode }[] = [
  { value: 'email', label: 'Email/Password', description: 'Traditional email and password authentication', icon: <Mail className="w-4 h-4" /> },
  { value: 'discord', label: 'Discord', description: 'OAuth authentication via Discord', icon: <MessageCircle className="w-4 h-4" /> },
  { value: 'kliento', label: 'Kliento', description: 'Phone-based authentication via Kliento (requires Product ID)', icon: <Phone className="w-4 h-4" /> },
];

const AUTH_METHOD_LABELS: Record<AuthMethod, string> = {
  email: 'Email/Password',
  discord: 'Discord',
  kliento: 'Kliento',
};

const KLIENTO_AUTH_TYPE_OPTIONS: { value: KlientoAuthType; label: string; description: string }[] = [
  { value: 'password', label: 'Password', description: 'Traditional password-based login' },
  { value: 'otp', label: 'OTP (Phone)', description: '4-digit code sent via SMS (60s expiry)' },
];

interface EditProjectConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  config: ProjectConfiguration | null;
}

const STEPS = [
  { number: 1, label: 'Basic Setup' },
  { number: 2, label: 'Branding' },
  { number: 3, label: 'Visual Identity' },
  { number: 4, label: 'Integration', optional: true },
  { number: 5, label: 'Legal Information' },
];

const EditProjectConfigModal: React.FC<EditProjectConfigModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  config,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set([1, 2, 3, 4, 5]));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [configName, setConfigName] = useState('');
  const [brandName, setBrandName] = useState('');
  const [logoAltText, setLogoAltText] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#FF6B00');
  const [secondaryColor, setSecondaryColor] = useState('#000000');
  const [accentColor, setAccentColor] = useState('#000000');
  const [infoSectionTextColor, setInfoSectionTextColor] = useState<string | null>(null);
  const [productId, setProductId] = useState('');
  const [campaignId, setCampaignId] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [packageId, setPackageId] = useState('');
  const [lpRedirectNoAccount, setLpRedirectNoAccount] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [languageCode, setLanguageCode] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [extraMetadata, setExtraMetadata] = useState('{}');
  const [snowplowEnabled, setSnowplowEnabled] = useState(false);
  const [snowplowAppId, setSnowplowAppId] = useState('');
  const [metadataExpanded, setMetadataExpanded] = useState(false);

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [domain, setDomain] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [checkingDomain, setCheckingDomain] = useState(false);
  const [domainAvailable, setDomainAvailable] = useState<boolean | null>(null);

  const [supportEmail, setSupportEmail] = useState('');
  const [legalEmail, setLegalEmail] = useState('');
  const [privacyEmail, setPrivacyEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [discordUrl, setDiscordUrl] = useState('');

  const [legalMode, setLegalMode] = useState<LegalMode>('variables');
  const [tosUrl, setTosUrl] = useState('');
  const [privacyPolicyUrl, setPrivacyPolicyUrl] = useState('');
  const [legalNoticeUrl, setLegalNoticeUrl] = useState('');
  const [contactUrl, setContactUrl] = useState('');

  const [authMethod, setAuthMethod] = useState<AuthMethod>('email');
  const [klientoAuthType, setKlientoAuthType] = useState<KlientoAuthType>('password');
  const [klientoOtpSmsTemplate, setKlientoOtpSmsTemplate] = useState(DEFAULT_OTP_SMS_TEMPLATE);
  const [defaultPhoneCountryIso, setDefaultPhoneCountryIso] = useState('');
  const [originalAuthMethod, setOriginalAuthMethod] = useState<AuthMethod>('email');
  const [showAuthChangeConfirm, setShowAuthChangeConfirm] = useState(false);
  const [pendingAuthMethod, setPendingAuthMethod] = useState<AuthMethod | null>(null);

  useEffect(() => {
    if (config && isOpen) {
      setConfigName(config.config_name);
      setBrandName(config.brand_name);
      setLogoAltText(config.logo_alt_text);
      setPrimaryColor(config.primary_color);
      setSecondaryColor(config.secondary_color);
      setAccentColor(config.accent_color || '#000000');
      setInfoSectionTextColor(config.info_section_text_color || null);
      setProductId(config.product_id || '');
      setCampaignId(config.campaign_id || '');
      setTemplateId(config.template_id || '');
      setPackageId(config.package_id || '');
      setLpRedirectNoAccount(config.lp_redirect_no_account || '');
      setServiceId(config.service_id || '');
      setCountryCode(config.country_code || '');
      setLanguageCode(config.language_code || '');
      setIsActive(config.is_active);
      setDomain(config.domain || '');
      setIsDefault(config.is_default || false);
      const metadataStr = JSON.stringify(config.extra_metadata, null, 2);
      setExtraMetadata(metadataStr);
      setMetadataExpanded(metadataStr !== '{}' && metadataStr !== '{\n  \n}');
      setSnowplowEnabled(config.snowplow_enabled || false);
      setSnowplowAppId(config.snowplow_app_id || '');
      setSupportEmail(config.support_email || '');
      setLegalEmail(config.legal_email || '');
      setPrivacyEmail(config.privacy_email || '');
      setCompanyName(config.company_name || '');
      setCompanyAddress(config.company_address || '');
      setPhoneNumber(config.phone_number || '');
      setRegistrationNumber(config.registration_number || '');
      setDiscordUrl(config.discord_url || '');
      setLegalMode(config.legal_mode || 'variables');
      setTosUrl(config.tos_url || '');
      setPrivacyPolicyUrl(config.privacy_policy_url || '');
      setLegalNoticeUrl(config.legal_notice_url || '');
      setContactUrl(config.contact_url || '');
      const configAuthMethod = config.auth_method || 'email';
      setAuthMethod(configAuthMethod);
      setKlientoAuthType(config.kliento_auth_type || 'password');
      setKlientoOtpSmsTemplate(config.kliento_otp_sms_template || DEFAULT_OTP_SMS_TEMPLATE);
      setDefaultPhoneCountryIso(config.default_phone_country_iso || '');
      setOriginalAuthMethod(configAuthMethod);
      setPendingAuthMethod(null);
      setShowAuthChangeConfirm(false);
      setLogoFile(null);
      setFaviconFile(null);
      setCheckingDomain(false);
      setDomainAvailable(null);
      setErrors({});
      setCurrentStep(1);
      setCompletedSteps(new Set([1, 2, 3, 4, 5]));
    }
  }, [config, isOpen]);

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!configName.trim()) {
        newErrors.configName = 'Config name is required';
      } else if (configName.trim().length < 3) {
        newErrors.configName = 'Config name must be at least 3 characters';
      }

      if (domain.trim() && isDefault) {
        newErrors.domain = 'Configuration cannot have both a domain and be set as default';
      }

      if (domain.trim()) {
        const normalizedDomain = normalizeDomain(domain.trim());
        const domainValidation = validateDomainFormat(normalizedDomain);
        if (!domainValidation.valid) {
          newErrors.domain = domainValidation.error || 'Invalid domain format';
        }
      }

      if (authMethod === 'kliento' && !productId.trim()) {
        newErrors.productId = 'Kliento authentication requires a Product ID';
      }

      if (authMethod === 'kliento' && !serviceId.trim()) {
        newErrors.serviceId = 'Kliento authentication requires a Service ID';
      }

      if (authMethod === 'kliento' && klientoAuthType === 'otp') {
        const templateValidation = validateOtpSmsTemplate(klientoOtpSmsTemplate);
        if (!templateValidation.valid) {
          newErrors.klientoOtpSmsTemplate = templateValidation.error || 'Invalid SMS template';
        }
        if (!defaultPhoneCountryIso) {
          newErrors.defaultPhoneCountryIso = 'Default phone country is required for OTP authentication';
        } else if (!isValidCountryIsoFromAll(defaultPhoneCountryIso)) {
          newErrors.defaultPhoneCountryIso = 'Invalid country selected';
        }
      }
    }

    if (step === 2) {
      if (!brandName.trim()) {
        newErrors.brandName = 'Brand name is required';
      } else if (brandName.trim().length < 3) {
        newErrors.brandName = 'Brand name must be at least 3 characters';
      }

      if (!logoAltText.trim()) {
        newErrors.logoAltText = 'Logo alt text is required';
      } else if (logoAltText.trim().length < 3) {
        newErrors.logoAltText = 'Logo alt text must be at least 3 characters';
      }
    }

    if (step === 3) {
      if (!validateHexColor(primaryColor)) {
        newErrors.primaryColor = 'Invalid color format. Use #RRGGBB';
      }

      if (!validateHexColor(secondaryColor)) {
        newErrors.secondaryColor = 'Invalid color format. Use #RRGGBB';
      }

      if (accentColor && accentColor !== '#000000' && !validateHexColor(accentColor)) {
        newErrors.accentColor = 'Invalid color format. Use #RRGGBB';
      }

      if (infoSectionTextColor && !validateHexColor(infoSectionTextColor)) {
        newErrors.infoSectionTextColor = 'Invalid color format. Use #RRGGBB';
      }
    }

    if (step === 4) {
      try {
        JSON.parse(extraMetadata);
      } catch {
        newErrors.extraMetadata = 'Invalid JSON format';
      }
    }

    if (step === 5) {
      if (legalMode === 'url') {
        if (tosUrl.trim() && !validateLegalUrl(tosUrl)) {
          newErrors.tosUrl = 'Invalid URL format';
        }
        if (privacyPolicyUrl.trim() && !validateLegalUrl(privacyPolicyUrl)) {
          newErrors.privacyPolicyUrl = 'Invalid URL format';
        }
        if (legalNoticeUrl.trim() && !validateLegalUrl(legalNoticeUrl)) {
          newErrors.legalNoticeUrl = 'Invalid URL format';
        }
        if (contactUrl.trim() && !validateLegalUrl(contactUrl)) {
          newErrors.contactUrl = 'Invalid URL format';
        }
      } else {
        if (!supportEmail.trim()) {
          newErrors.supportEmail = 'Support email is required';
        } else if (!validateEmail(supportEmail)) {
          newErrors.supportEmail = 'Invalid email format';
        }

        if (!legalEmail.trim()) {
          newErrors.legalEmail = 'Legal email is required';
        } else if (!validateEmail(legalEmail)) {
          newErrors.legalEmail = 'Invalid email format';
        }

        if (!privacyEmail.trim()) {
          newErrors.privacyEmail = 'Privacy email is required';
        } else if (!validateEmail(privacyEmail)) {
          newErrors.privacyEmail = 'Invalid email format';
        }

        if (!companyName.trim()) {
          newErrors.companyName = 'Company name is required';
        }

        if (!companyAddress.trim()) {
          newErrors.companyAddress = 'Company address is required';
        }

        if (!phoneNumber.trim()) {
          newErrors.phoneNumber = 'Phone number is required';
        }

        if (!registrationNumber.trim()) {
          newErrors.registrationNumber = 'Registration number is required';
        }

        if (discordUrl.trim() && !validateDiscordUrl(discordUrl)) {
          newErrors.discordUrl = 'Invalid Discord URL format. Use https://discord.gg/[invite-code]';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < STEPS.length) {
        setCurrentStep(currentStep + 1);
      }
    } else {
      toast.error('Please fix the errors before proceeding');
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (step: number) => {
    setCurrentStep(step);
  };

  const handleAuthMethodChange = (newMethod: AuthMethod) => {
    if (newMethod === originalAuthMethod) {
      setAuthMethod(newMethod);
      setPendingAuthMethod(null);
      return;
    }
    setPendingAuthMethod(newMethod);
    setShowAuthChangeConfirm(true);
  };

  const confirmAuthMethodChange = () => {
    if (pendingAuthMethod) {
      setAuthMethod(pendingAuthMethod);
    }
    setPendingAuthMethod(null);
    setShowAuthChangeConfirm(false);
  };

  const cancelAuthMethodChange = () => {
    setPendingAuthMethod(null);
    setShowAuthChangeConfirm(false);
  };

  const handleSubmit = async () => {
    if (!config) return;

    if (!validateStep(currentStep)) {
      toast.error('Please fix the errors in the form');
      return;
    }

    for (let i = 1; i <= 5; i++) {
      if (!validateStep(i)) {
        toast.error(`Please complete step ${i} correctly`);
        setCurrentStep(i);
        return;
      }
    }

    try {
      setIsSubmitting(true);

      let logoPath = config.logo_path;
      let faviconPath = config.favicon_path;

      if (logoFile) {
        const logoResult = await uploadFile(logoFile, `logos/${config.config_id}-logo`);
        if (logoResult.error) {
          throw new Error('Failed to upload logo: ' + logoResult.error.message);
        }
        logoPath = logoResult.path;
      }

      if (faviconFile) {
        const faviconResult = await uploadFile(faviconFile, `favicons/${config.config_id}-favicon`);
        if (faviconResult.error) {
          throw new Error('Failed to upload favicon: ' + faviconResult.error.message);
        }
        faviconPath = faviconResult.path;
      }

      const isKlientoOtp = authMethod === 'kliento' && klientoAuthType === 'otp';
      const phoneCountryIso = isKlientoOtp ? defaultPhoneCountryIso : null;
      const phoneCountryCode = phoneCountryIso ? getDialCodeNumeric(phoneCountryIso) : null;

      const { error } = await updateProjectConfiguration({
        id: config.id,
        config_name: configName.trim(),
        brand_name: brandName.trim(),
        logo_path: logoPath,
        favicon_path: faviconPath,
        logo_alt_text: logoAltText.trim(),
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        accent_color: accentColor && accentColor !== '#000000' ? accentColor : null,
        info_section_text_color: infoSectionTextColor || null,
        product_id: productId.trim() || null,
        campaign_id: campaignId.trim() || null,
        domain: domain.trim() || null,
        is_default: isDefault,
        is_active: isActive,
        auth_method: authMethod,
        kliento_auth_type: authMethod === 'kliento' ? klientoAuthType : null,
        kliento_otp_sms_template: isKlientoOtp ? klientoOtpSmsTemplate.trim() : null,
        default_phone_country_iso: phoneCountryIso,
        default_phone_country_code: phoneCountryCode,
        template_id: templateId.trim() || null,
        package_id: packageId.trim() || null,
        lp_redirect_no_account: lpRedirectNoAccount.trim() || null,
        service_id: serviceId.trim() || null,
        country_code: countryCode.trim() || null,
        language_code: languageCode.trim() || null,
        extra_metadata: JSON.parse(extraMetadata),
        snowplow_enabled: snowplowEnabled,
        snowplow_app_id: snowplowAppId.trim() || null,
        support_email: supportEmail.trim(),
        legal_email: legalEmail.trim(),
        privacy_email: privacyEmail.trim(),
        company_name: companyName.trim(),
        company_address: companyAddress.trim(),
        phone_number: phoneNumber.trim(),
        registration_number: registrationNumber.trim(),
        discord_url: discordUrl.trim() || null,
        legal_mode: legalMode,
        tos_url: legalMode === 'url' ? (tosUrl.trim() || null) : null,
        privacy_policy_url: legalMode === 'url' ? (privacyPolicyUrl.trim() || null) : null,
        legal_notice_url: legalMode === 'url' ? (legalNoticeUrl.trim() || null) : null,
        contact_url: legalMode === 'url' ? (contactUrl.trim() || null) : null,
      });

      if (error) throw error;

      toast.success('Configuration updated successfully');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error updating configuration:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update configuration');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    if (!config) return null;

    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="text-base md:text-lg font-semibold text-white mb-3 md:mb-4">Basic Setup</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-300 mb-2">
                  Config ID
                </label>
                <div className="px-3 py-2 bg-dark-200 rounded-lg text-gray-400 font-mono text-xs md:text-sm border border-dark-100">
                  {config.config_id}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Cannot be changed after creation
                </p>
              </div>

              <Input
                label="Config Name"
                value={configName}
                onChange={(e) => setConfigName(e.target.value)}
                error={errors.configName}
                placeholder="Default Configuration"
                helperText="Descriptive name for this configuration"
                required
              />
            </div>

            <Input
              label="Domain Name (Optional)"
              value={domain}
              onChange={(e) => {
                setDomain(e.target.value);
                setDomainAvailable(null);
                if (e.target.value.trim()) {
                  setIsDefault(false);
                }
              }}
              error={errors.domain}
              placeholder="partner-xyz.example.com"
              helperText="Leave empty to use as default configuration"
            />

            {domain.trim() && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    const normalized = normalizeDomain(domain.trim());
                    const validation = validateDomainFormat(normalized);
                    if (!validation.valid) {
                      toast.error(validation.error || 'Invalid domain format');
                      return;
                    }
                    setCheckingDomain(true);
                    const result = await checkDomainAvailability(normalized, config.id);
                    setCheckingDomain(false);
                    if (result.error) {
                      toast.error('Error checking domain availability');
                    } else {
                      setDomainAvailable(result.available);
                      toast.success(result.available ? 'Domain is available' : 'Domain is already in use');
                    }
                  }}
                  isLoading={checkingDomain}
                  className="w-full sm:w-auto"
                >
                  Check Availability
                </Button>
                {domainAvailable !== null && (
                  <div className="flex items-center gap-1">
                    {domainAvailable ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-success-500" />
                        <span className="text-xs md:text-sm text-success-500">Available</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4 text-error-500" />
                        <span className="text-xs md:text-sm text-error-500">Already in use</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="mt-4">
              <label className="block text-xs md:text-sm font-medium text-gray-300 mb-2">
                Authentication Method <span className="text-error-500">*</span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {AUTH_METHOD_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className={`
                      flex items-start gap-2 p-2 md:p-3 rounded-lg border cursor-pointer transition-all
                      ${authMethod === option.value
                        ? 'border-primary-500 bg-primary-500/10'
                        : 'border-dark-200 bg-dark-300 hover:border-dark-100'
                      }
                    `}
                  >
                    <input
                      type="radio"
                      name="authMethod"
                      value={option.value}
                      checked={authMethod === option.value}
                      onChange={(e) => handleAuthMethodChange(e.target.value as AuthMethod)}
                      className="mt-0.5 accent-primary-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={authMethod === option.value ? 'text-primary-500' : 'text-gray-400'}>
                          {option.icon}
                        </span>
                        <span className="font-medium text-white text-sm">{option.label}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5 hidden md:block">{option.description}</p>
                    </div>
                  </label>
                ))}
              </div>
              {errors.authMethod && (
                <p className="text-xs text-error-500 mt-2">{errors.authMethod}</p>
              )}
              {authMethod === 'kliento' && (
                <>
                  <div className="mt-4 p-4 bg-dark-200 border border-dark-100 rounded-lg">
                    <h4 className="text-sm font-medium text-white mb-3">Kliento Configuration</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Input
                        label="Product ID"
                        value={productId}
                        onChange={(e) => setProductId(e.target.value)}
                        placeholder="product-123"
                        helperText="Required for Kliento authentication"
                        required
                        error={errors.productId}
                      />
                      <Input
                        label="Service ID"
                        value={serviceId}
                        onChange={(e) => setServiceId(e.target.value)}
                        placeholder="service-123"
                        helperText="Required for Kliento authentication"
                        required
                        error={errors.serviceId}
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-xs md:text-sm font-medium text-gray-300 mb-2">
                      Kliento Authentication Type
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {KLIENTO_AUTH_TYPE_OPTIONS.map((option) => (
                        <label
                          key={option.value}
                          className={`
                            flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all
                            ${klientoAuthType === option.value
                              ? 'border-primary-500 bg-primary-500/10'
                              : 'border-dark-200 bg-dark-300 hover:border-dark-100'
                            }
                          `}
                        >
                          <input
                            type="radio"
                            name="klientoAuthType"
                            value={option.value}
                            checked={klientoAuthType === option.value}
                            onChange={(e) => setKlientoAuthType(e.target.value as KlientoAuthType)}
                            className="mt-1 accent-primary-500"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="font-medium text-white text-sm">{option.label}</span>
                            <p className="text-xs text-gray-400 mt-0.5">{option.description}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {klientoAuthType === 'otp' && (
                    <div className="mt-4">
                      <label className="block text-xs md:text-sm font-medium text-gray-300 mb-2">
                        SMS Template <span className="text-error-500">*</span>
                      </label>
                      <textarea
                        value={klientoOtpSmsTemplate}
                        onChange={(e) => setKlientoOtpSmsTemplate(e.target.value)}
                        className={`
                          w-full px-3 py-2 min-h-[80px] text-xs md:text-sm
                          bg-dark-300
                          border ${errors.klientoOtpSmsTemplate ? 'border-error-500' : klientoOtpSmsTemplate.length > OTP_SMS_TEMPLATE_MAX_LENGTH ? 'border-warning-500' : 'border-dark-200'}
                          rounded-lg
                          text-white
                          focus:outline-none focus:ring-2 focus:ring-primary-500
                        `}
                        placeholder="{{BRAND_NAME}}: Your OTP is {{OTP_CODE}}"
                      />
                      {errors.klientoOtpSmsTemplate && (
                        <p className="text-xs text-error-500 mt-1">{errors.klientoOtpSmsTemplate}</p>
                      )}
                      <div className="flex items-center justify-between mt-1">
                        <div className="text-xs text-gray-400">
                          <span>Available placeholders: </span>
                          <code className="bg-dark-200 px-1 py-0.5 rounded text-primary-400">{'{{OTP_CODE}}'}</code>
                          <span className="text-gray-500"> (required)</span>
                          <span className="mx-1">and</span>
                          <code className="bg-dark-200 px-1 py-0.5 rounded text-primary-400">{'{{BRAND_NAME}}'}</code>
                        </div>
                        <span className={`text-xs ${klientoOtpSmsTemplate.length > OTP_SMS_TEMPLATE_MAX_LENGTH ? 'text-warning-500' : 'text-gray-500'}`}>
                          {klientoOtpSmsTemplate.length}/{OTP_SMS_TEMPLATE_MAX_LENGTH}
                        </span>
                      </div>
                      {klientoOtpSmsTemplate.length > OTP_SMS_TEMPLATE_MAX_LENGTH && (
                        <div className="flex items-start gap-2 mt-2 p-2 bg-warning-500/10 border border-warning-500/30 rounded-lg">
                          <AlertTriangle className="w-4 h-4 text-warning-500 flex-shrink-0 mt-0.5" />
                          <p className="text-xs text-warning-400">
                            Messages over 160 characters may be split into multiple SMS, which could affect delivery and cost.
                          </p>
                        </div>
                      )}
                      <div className="mt-3 p-3 bg-dark-200 rounded-lg border border-dark-100">
                        <p className="text-xs text-gray-400 mb-2">Preview:</p>
                        <div className="bg-gray-700 rounded-2xl rounded-tl-sm px-3 py-2 max-w-[280px]">
                          <p className="text-sm text-white break-words">
                            {klientoOtpSmsTemplate
                              .replace(/\{\{BRAND_NAME\}\}/g, brandName || 'Brand')
                              .replace(/\{\{OTP_CODE\}\}/g, '1234')}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4">
                        <SearchableCountrySelect
                          label="Default Phone Country"
                          value={defaultPhoneCountryIso}
                          onChange={setDefaultPhoneCountryIso}
                          error={errors.defaultPhoneCountryIso}
                          helperText="Required for SMS delivery via Sendito API"
                          required
                          placeholder="Search for a country..."
                        />
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 pt-2">
              <Checkbox
                label="Active"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                helperText="Inactive configurations won't be accessible"
              />

              <Checkbox
                label="Set as default"
                checked={isDefault}
                onChange={(e) => {
                  setIsDefault(e.target.checked);
                  if (e.target.checked) {
                    setDomain('');
                    setDomainAvailable(null);
                  }
                }}
                disabled={domain.trim().length > 0}
                helperText="Used when no domain-specific config is found"
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <h3 className="text-base md:text-lg font-semibold text-white mb-3 md:mb-4">Branding Assets</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <Input
                label="Brand Name"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                error={errors.brandName}
                placeholder="Orange Arena"
                helperText="Displayed throughout the app"
                required
              />

              <Input
                label="Logo Alt Text"
                value={logoAltText}
                onChange={(e) => setLogoAltText(e.target.value)}
                error={errors.logoAltText}
                placeholder="Orange Arena E-Sport"
                helperText="For accessibility"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <FileUploadInput
                label="Logo"
                accept="image/svg+xml,image/png,image/jpeg"
                value={logoFile}
                previewUrl={config.logo_path}
                onChange={setLogoFile}
                helperText="Upload new logo to replace current"
              />

              <FileUploadInput
                label="Favicon"
                accept="image/x-icon,image/vnd.microsoft.icon,image/svg+xml,image/png"
                value={faviconFile}
                previewUrl={config.favicon_path}
                onChange={setFaviconFile}
                helperText="Upload new favicon to replace current"
              />
            </div>
          </div>
        );

      case 3:
        const accentSimilarToPrimary = accentColor && accentColor !== '#000000' && areColorsSimilar(accentColor, primaryColor);
        const accentSimilarToSecondary = accentColor && accentColor !== '#000000' && areColorsSimilar(accentColor, secondaryColor);
        const showAccentWarning = accentSimilarToPrimary || accentSimilarToSecondary;
        const displayInfoTextColor = infoSectionTextColor || accentColor || primaryColor;

        return (
          <div className="space-y-4">
            <h3 className="text-base md:text-lg font-semibold text-white mb-3 md:mb-4">Visual Identity</h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              <ColorPickerInput
                label="Primary Color"
                value={primaryColor}
                onChange={setPrimaryColor}
                error={errors.primaryColor}
                helperText="Main brand color"
                required
              />

              <ColorPickerInput
                label="Secondary Color"
                value={secondaryColor}
                onChange={setSecondaryColor}
                error={errors.secondaryColor}
                helperText="Supporting brand color"
                required
              />

              <ColorPickerInput
                label="Accent Color"
                value={accentColor}
                onChange={setAccentColor}
                error={errors.accentColor}
                helperText="For text variations"
              />

              <div>
                <ColorPickerInput
                  label="Info Section Text"
                  value={infoSectionTextColor || '#888888'}
                  onChange={setInfoSectionTextColor}
                  error={errors.infoSectionTextColor}
                  helperText={infoSectionTextColor ? 'Custom color' : 'Falls back to accent'}
                />
                {infoSectionTextColor && (
                  <button
                    type="button"
                    onClick={() => setInfoSectionTextColor(null)}
                    className="mt-1 flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="w-3 h-3" />
                    <span>Clear (use accent)</span>
                  </button>
                )}
              </div>
            </div>

            {showAccentWarning && (
              <div className="flex items-start gap-2 p-3 bg-warning-500/10 border border-warning-500/30 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-warning-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-warning-400">
                  The accent color is very similar to your {accentSimilarToPrimary ? 'primary' : 'secondary'} color.
                  Consider choosing a more distinct color for better visual contrast.
                </p>
              </div>
            )}

            <div className="mt-4 md:mt-6 p-3 md:p-4 bg-dark-200 rounded-lg border border-dark-100">
              <h4 className="text-xs md:text-sm font-medium text-white mb-2 md:mb-3">Color Preview</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
                <div className="flex-1">
                  <div
                    className="h-16 md:h-20 rounded-lg border-2 border-white shadow-lg"
                    style={{ backgroundColor: primaryColor }}
                  />
                  <p className="text-xs text-center text-gray-400 mt-1 md:mt-2">Primary</p>
                </div>
                <div className="flex-1">
                  <div
                    className="h-16 md:h-20 rounded-lg border-2 border-white shadow-lg"
                    style={{ backgroundColor: secondaryColor }}
                  />
                  <p className="text-xs text-center text-gray-400 mt-1 md:mt-2">Secondary</p>
                </div>
                <div className="flex-1">
                  <div
                    className="h-16 md:h-20 rounded-lg border-2 border-white shadow-lg"
                    style={{ backgroundColor: accentColor }}
                  />
                  <p className="text-xs text-center text-gray-400 mt-1 md:mt-2">Accent</p>
                </div>
                <div className="flex-1">
                  <div
                    className="h-16 md:h-20 rounded-lg border-2 border-white shadow-lg"
                    style={{ backgroundColor: infoSectionTextColor || accentColor }}
                  />
                  <p className="text-xs text-center text-gray-400 mt-1 md:mt-2">Info Text</p>
                </div>
              </div>

              {(accentColor && accentColor !== '#000000') && (
                <>
                  <h4 className="text-xs md:text-sm font-medium text-white mt-4 mb-2 md:mb-3">Color Usage Examples</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
                    <div className="flex-1">
                      <div
                        className="h-12 md:h-14 rounded-lg border border-dark-100 flex items-center justify-center"
                        style={{ backgroundColor: '#1a1a2e' }}
                      >
                        <span style={{ color: accentColor }} className="font-semibold text-xs md:text-sm">
                          Accent Text
                        </span>
                      </div>
                      <p className="text-xs text-center text-gray-400 mt-1">Accent</p>
                    </div>
                    <div className="flex-1">
                      <div
                        className="h-12 md:h-14 rounded-lg border border-dark-100 flex items-center justify-center"
                        style={{ backgroundColor: '#1a1a2e' }}
                      >
                        <span style={{ color: displayInfoTextColor }} className="font-semibold text-xs md:text-sm">
                          Info Text
                        </span>
                      </div>
                      <p className="text-xs text-center text-gray-400 mt-1">Info Section</p>
                    </div>
                    <div className="flex-1">
                      <div
                        className="h-12 md:h-14 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: '#1a1a2e', border: `2px solid ${accentColor}` }}
                      >
                        <span className="text-white font-semibold text-xs md:text-sm">Border</span>
                      </div>
                      <p className="text-xs text-center text-gray-400 mt-1">As Border</p>
                    </div>
                    <div className="flex-1">
                      <div
                        className="h-12 md:h-14 rounded-lg border border-dark-100 flex items-center justify-center"
                        style={{ backgroundColor: `${accentColor}20` }}
                      >
                        <span style={{ color: accentColor }} className="font-semibold text-xs md:text-sm">Subtle BG</span>
                      </div>
                      <p className="text-xs text-center text-gray-400 mt-1">Background Tint</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <h3 className="text-base md:text-lg font-semibold text-white mb-3 md:mb-4">Integration & Advanced</h3>

            {authMethod === 'kliento' && (
              <div className="flex items-start gap-2 p-3 bg-primary-500/10 border border-primary-500/30 rounded-lg">
                <Info className="w-4 h-4 text-primary-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-primary-400">
                  Kliento Product ID and Service ID are configured in the Basic Setup step.
                </p>
              </div>
            )}

            {authMethod !== 'kliento' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <Input
                  label="Product ID"
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  placeholder="product-123"
                  helperText="External product identifier"
                />
                <Input
                  label="Campaign ID"
                  value={campaignId}
                  onChange={(e) => setCampaignId(e.target.value)}
                  placeholder="campaign-456"
                  helperText="External campaign identifier"
                />
              </div>
            )}

            {authMethod === 'kliento' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  <Input
                    label="Template ID"
                    value={templateId}
                    onChange={(e) => setTemplateId(e.target.value)}
                    placeholder="template-123"
                    helperText="Kliento template identifier (optional)"
                  />
                  <Input
                    label="LP Redirection If No Account"
                    value={lpRedirectNoAccount}
                    onChange={(e) => setLpRedirectNoAccount(e.target.value)}
                    placeholder="https://example.com/signup"
                    helperText="Redirect URL for users without an existing account (optional)"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  <Input
                    label="Campaign ID"
                    value={campaignId}
                    onChange={(e) => setCampaignId(e.target.value)}
                    placeholder="campaign-456"
                    helperText="External campaign identifier"
                  />
                  <Input
                    label="Package ID"
                    value={packageId}
                    onChange={(e) => setPackageId(e.target.value)}
                    placeholder="package-456"
                    helperText="Kliento package identifier (optional)"
                  />
                </div>
              </>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <div className="bg-dark-200 border border-dark-100 rounded-lg p-3 md:p-4">
                <h4 className="text-sm font-medium text-white mb-3">Galaxy API Locale</h4>
                <p className="text-xs text-gray-400 mb-3">
                  Country and language codes used for Galaxy content API calls
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Country Code"
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    placeholder="FR"
                    helperText="ISO country code (e.g. FR, US, GB)"
                  />
                  <Input
                    label="Language Code"
                    value={languageCode}
                    onChange={(e) => setLanguageCode(e.target.value)}
                    placeholder="fr"
                    helperText="ISO language code (e.g. fr, en, es)"
                  />
                </div>
              </div>

              <div className="bg-dark-200 border border-dark-100 rounded-lg p-3 md:p-4">
                <h4 className="text-sm font-medium text-white mb-3">Snowplow Analytics</h4>
                <p className="text-xs text-gray-400 mb-3">
                  Configure Snowplow analytics tracking for this tenant
                </p>
                <div className="mb-3">
                  <Checkbox
                    id="edit-snowplow-enabled"
                    checked={snowplowEnabled}
                    onChange={(e) => setSnowplowEnabled(e.target.checked)}
                    label="Enable Snowplow Tracking"
                    description="Activate Snowplow analytics event collection for this tenant"
                  />
                </div>
                <Input
                  label="Snowplow App ID"
                  value={snowplowAppId}
                  onChange={(e) => setSnowplowAppId(e.target.value)}
                  placeholder="orange-arena-tn"
                  helperText="Unique application identifier for Snowplow tracking (optional)"
                  disabled={!snowplowEnabled}
                />
              </div>
            </div>

            <div className="mt-3 md:mt-4">
              <button
                type="button"
                onClick={() => setMetadataExpanded(!metadataExpanded)}
                className="flex items-center gap-2 text-xs md:text-sm font-medium text-gray-300 hover:text-white transition-colors"
              >
                {metadataExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                Extra Metadata (JSON)
                {extraMetadata !== '{}' && !metadataExpanded && (
                  <span className="text-xs text-gray-500 font-normal ml-1">-- configured</span>
                )}
              </button>
              {metadataExpanded && (
                <div className="mt-2">
                  <textarea
                    value={extraMetadata}
                    onChange={(e) => setExtraMetadata(e.target.value)}
                    className={`
                      w-full px-3 py-2 min-h-[80px] md:min-h-[100px] font-mono text-xs md:text-sm
                      bg-dark-300
                      border ${errors.extraMetadata ? 'border-error-500' : 'border-dark-200'}
                      rounded-lg
                      text-white
                      focus:outline-none focus:ring-2 focus:ring-primary-500
                    `}
                    placeholder='{"key": "value"}'
                  />
                  {errors.extraMetadata && (
                    <p className="text-xs text-error-500 mt-1">{errors.extraMetadata}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    Additional configuration data in JSON format
                  </p>
                </div>
              )}
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <h3 className="text-base md:text-lg font-semibold text-white mb-3 md:mb-4">Legal Information</h3>

            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => { setLegalMode('variables'); setErrors({}); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  legalMode === 'variables'
                    ? 'bg-primary-600 text-white'
                    : 'bg-dark-200 text-gray-400 hover:text-white hover:bg-dark-100'
                }`}
              >
                <FileText className="h-4 w-4" />
                Template Variables
              </button>
              <button
                type="button"
                onClick={() => { setLegalMode('url'); setErrors({}); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  legalMode === 'url'
                    ? 'bg-primary-600 text-white'
                    : 'bg-dark-200 text-gray-400 hover:text-white hover:bg-dark-100'
                }`}
              >
                <Globe className="h-4 w-4" />
                External URLs
              </button>
            </div>

            {legalMode === 'url' ? (
              <>
                <div className="bg-dark-200 border border-dark-100 rounded-lg p-3 md:p-4 mb-4">
                  <h4 className="text-sm font-medium text-white mb-2">External Legal Pages</h4>
                  <p className="text-xs text-gray-400">
                    Provide URLs to your externally hosted legal pages. Users will be redirected to these links.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  <Input
                    label="Terms of Service URL"
                    value={tosUrl}
                    onChange={(e) => setTosUrl(e.target.value)}
                    error={errors.tosUrl}
                    placeholder="https://example.com/terms"
                    helperText="Link to your Terms of Service page"
                  />
                  <Input
                    label="Privacy Policy URL"
                    value={privacyPolicyUrl}
                    onChange={(e) => setPrivacyPolicyUrl(e.target.value)}
                    error={errors.privacyPolicyUrl}
                    placeholder="https://example.com/privacy"
                    helperText="Link to your Privacy Policy page"
                  />
                  <Input
                    label="Legal Notice URL"
                    value={legalNoticeUrl}
                    onChange={(e) => setLegalNoticeUrl(e.target.value)}
                    error={errors.legalNoticeUrl}
                    placeholder="https://example.com/legal-notice"
                    helperText="Link to your Legal Notice page"
                  />
                  <Input
                    label="Contact Page URL"
                    value={contactUrl}
                    onChange={(e) => setContactUrl(e.target.value)}
                    error={errors.contactUrl}
                    placeholder="https://example.com/contact"
                    helperText="Link to your Contact page"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="bg-dark-200 border border-dark-100 rounded-lg p-3 md:p-4 mb-4">
                  <h4 className="text-sm font-medium text-white mb-2">Contact Information</h4>
                  <p className="text-xs text-gray-400">
                    These email addresses will be used in legal documents and communications
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                  <Input
                    label="Support Email"
                    type="email"
                    value={supportEmail}
                    onChange={(e) => setSupportEmail(e.target.value)}
                    error={errors.supportEmail}
                    placeholder="support@example.com"
                    helperText="General support inquiries"
                    required
                  />

                  <Input
                    label="Legal Email"
                    type="email"
                    value={legalEmail}
                    onChange={(e) => setLegalEmail(e.target.value)}
                    error={errors.legalEmail}
                    placeholder="legal@example.com"
                    helperText="Legal matters and compliance"
                    required
                  />

                  <Input
                    label="Privacy Email"
                    type="email"
                    value={privacyEmail}
                    onChange={(e) => setPrivacyEmail(e.target.value)}
                    error={errors.privacyEmail}
                    placeholder="privacy@example.com"
                    helperText="Privacy-related concerns"
                    required
                  />
                </div>

                <div className="bg-dark-200 border border-dark-100 rounded-lg p-3 md:p-4 mb-4">
                  <h4 className="text-sm font-medium text-white mb-2">Company Information</h4>
                  <p className="text-xs text-gray-400">
                    Official company details for legal documents
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  <Input
                    label="Company Name"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    error={errors.companyName}
                    placeholder="Acme Corporation"
                    helperText="Official registered company name"
                    required
                  />

                  <Input
                    label="Registration Number"
                    value={registrationNumber}
                    onChange={(e) => setRegistrationNumber(e.target.value)}
                    error={errors.registrationNumber}
                    placeholder="12345678"
                    helperText="Company registration or tax ID"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  <Input
                    label="Phone Number"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    error={errors.phoneNumber}
                    placeholder="+1 (555) 123-4567"
                    helperText="Company contact phone number"
                    required
                  />

                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-300 mb-2">
                      Company Address <span className="text-error-500">*</span>
                    </label>
                    <textarea
                      value={companyAddress}
                      onChange={(e) => setCompanyAddress(e.target.value)}
                      className={`
                        w-full px-3 py-2 min-h-[60px] text-xs md:text-sm
                        bg-dark-300
                        border ${errors.companyAddress ? 'border-error-500' : 'border-dark-200'}
                        rounded-lg
                        text-white
                        focus:outline-none focus:ring-2 focus:ring-primary-500
                      `}
                      placeholder="123 Main Street, Suite 100, City, State, ZIP"
                    />
                    {errors.companyAddress && (
                      <p className="text-xs text-error-500 mt-1">{errors.companyAddress}</p>
                    )}
                  </div>
                </div>

                <Input
                  label="Discord Invite URL (Community)"
                  value={discordUrl}
                  onChange={(e) => setDiscordUrl(e.target.value)}
                  error={errors.discordUrl}
                  placeholder="https://discord.gg/your-server"
                  helperText="Discord server invite link for the Contact page (optional)"
                />
              </>
            )}

            <div className="mt-6">
              <LegalVariablesPreview
                supportEmail={supportEmail}
                legalEmail={legalEmail}
                privacyEmail={privacyEmail}
                companyName={companyName}
                companyAddress={companyAddress}
                phoneNumber={phoneNumber}
                registrationNumber={registrationNumber}
                discordUrl={discordUrl}
                legalMode={legalMode}
                tosUrl={tosUrl}
                privacyPolicyUrl={privacyPolicyUrl}
                legalNoticeUrl={legalNoticeUrl}
                contactUrl={contactUrl}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (!config) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Project Configuration"
      size="4xl"
      mobileSize="full"
      footer={
        <div className="flex flex-col-reverse sm:flex-row justify-between items-stretch sm:items-center gap-2 sm:gap-0">
          <div>
            {currentStep > 1 && (
              <Button
                variant="ghost"
                onClick={handlePrevious}
                leftIcon={<ArrowLeft size={16} />}
                disabled={isSubmitting}
                className="w-full sm:w-auto"
              >
                Previous
              </Button>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <Button variant="ghost" onClick={onClose} disabled={isSubmitting} className="w-full sm:w-auto order-3 sm:order-1">
              Cancel
            </Button>
            {currentStep < STEPS.length && (
              <Button
                variant="ghost"
                onClick={handleNext}
                rightIcon={<ArrowRight size={16} />}
                disabled={isSubmitting}
                className="w-full sm:w-auto order-2 sm:order-2"
              >
                Next
              </Button>
            )}
            <Button
              onClick={handleSubmit}
              isLoading={isSubmitting}
              leftIcon={<Edit size={16} />}
              className="w-full sm:w-auto order-1 sm:order-3"
            >
              <span className="hidden sm:inline">Save Changes</span>
              <span className="sm:hidden">Save</span>
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 md:space-y-6">
        <WizardStepIndicator
          steps={STEPS}
          currentStep={currentStep}
          completedSteps={completedSteps}
          onStepClick={handleStepClick}
        />

        <div className="min-h-[300px] md:min-h-[400px]">
          {renderStep()}
        </div>
      </div>

      <ConfirmationModal
        isOpen={showAuthChangeConfirm}
        onClose={cancelAuthMethodChange}
        onConfirm={confirmAuthMethodChange}
        title="Change Authentication Method?"
        message={
          <div className="space-y-3">
            <div className="flex items-start gap-2 p-3 bg-warning-500/10 border border-warning-500/30 rounded-lg">
              <AlertTriangleIcon className="w-5 h-5 text-warning-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-warning-400">
                Changing the authentication method may affect existing users who registered with the previous method.
              </p>
            </div>
            <div className="text-sm text-gray-300">
              <p className="mb-2">You are changing from:</p>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-white">{AUTH_METHOD_LABELS[originalAuthMethod]}</span>
                <span className="text-gray-500">to</span>
                <span className="font-medium text-primary-400">{pendingAuthMethod ? AUTH_METHOD_LABELS[pendingAuthMethod] : ''}</span>
              </div>
            </div>
          </div>
        }
        confirmText="Change Method"
        cancelText="Cancel"
        variant="warning"
      />
    </Modal>
  );
};

export default EditProjectConfigModal;
