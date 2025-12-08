import React, { useState, useEffect } from 'react';
import { Edit, ArrowLeft, ArrowRight } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import ColorPickerInput from '../ui/ColorPickerInput';
import FileUploadInput from '../ui/FileUploadInput';
import Checkbox from '../ui/Checkbox';
import toast from 'react-hot-toast';
import WizardStepIndicator from './WizardStepIndicator';
import {
  updateProjectConfiguration,
  uploadFile,
  validateHexColor,
  ProjectConfiguration,
  checkDomainAvailability,
  validateEmail,
} from '../../services/projectConfigService';
import { validateDomainFormat, normalizeDomain } from '../../utils/domainValidation';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { LegalVariablesPreview } from './LegalVariablesPreview';

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
  const [productId, setProductId] = useState('');
  const [campaignId, setCampaignId] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [extraMetadata, setExtraMetadata] = useState('{}');

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

  useEffect(() => {
    if (config && isOpen) {
      setConfigName(config.config_name);
      setBrandName(config.brand_name);
      setLogoAltText(config.logo_alt_text);
      setPrimaryColor(config.primary_color);
      setSecondaryColor(config.secondary_color);
      setProductId(config.product_id || '');
      setCampaignId(config.campaign_id || '');
      setIsActive(config.is_active);
      setDomain(config.domain || '');
      setIsDefault(config.is_default || false);
      setExtraMetadata(JSON.stringify(config.extra_metadata, null, 2));
      setSupportEmail(config.support_email || '');
      setLegalEmail(config.legal_email || '');
      setPrivacyEmail(config.privacy_email || '');
      setCompanyName(config.company_name || '');
      setCompanyAddress(config.company_address || '');
      setPhoneNumber(config.phone_number || '');
      setRegistrationNumber(config.registration_number || '');
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
    }

    if (step === 4) {
      try {
        JSON.parse(extraMetadata);
      } catch {
        newErrors.extraMetadata = 'Invalid JSON format';
      }
    }

    if (step === 5) {
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

      const { error } = await updateProjectConfiguration({
        id: config.id,
        config_name: configName.trim(),
        brand_name: brandName.trim(),
        logo_path: logoPath,
        favicon_path: faviconPath,
        logo_alt_text: logoAltText.trim(),
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        product_id: productId.trim() || null,
        campaign_id: campaignId.trim() || null,
        domain: domain.trim() || null,
        is_default: isDefault,
        is_active: isActive,
        extra_metadata: JSON.parse(extraMetadata),
        support_email: supportEmail.trim(),
        legal_email: legalEmail.trim(),
        privacy_email: privacyEmail.trim(),
        company_name: companyName.trim(),
        company_address: companyAddress.trim(),
        phone_number: phoneNumber.trim(),
        registration_number: registrationNumber.trim(),
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

            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-300 mb-2">
                Config ID
              </label>
              <div className="px-3 py-2 bg-dark-200 rounded-lg text-gray-400 font-mono text-xs md:text-sm border border-dark-100">
                {config.config_id}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Config ID cannot be changed after creation
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
        return (
          <div className="space-y-4">
            <h3 className="text-base md:text-lg font-semibold text-white mb-3 md:mb-4">Visual Identity</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
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
            </div>

            <div className="mt-4 md:mt-6 p-3 md:p-4 bg-dark-200 rounded-lg border border-dark-100">
              <h4 className="text-xs md:text-sm font-medium text-white mb-2 md:mb-3">Color Preview</h4>
              <div className="grid grid-cols-3 gap-2 md:gap-3">
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
                    className="h-16 md:h-20 rounded-lg border-2 border-white shadow-lg flex items-center justify-center"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <span style={{ color: secondaryColor }} className="font-bold text-sm md:text-lg">
                      {brandName || 'Brand'}
                    </span>
                  </div>
                  <p className="text-xs text-center text-gray-400 mt-1 md:mt-2">Combined</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <h3 className="text-base md:text-lg font-semibold text-white mb-3 md:mb-4">Integration & Advanced</h3>

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

            <div className="mt-3 md:mt-4">
              <label className="block text-xs md:text-sm font-medium text-gray-300 mb-2">
                Extra Metadata (JSON)
              </label>
              <textarea
                value={extraMetadata}
                onChange={(e) => setExtraMetadata(e.target.value)}
                className={`
                  w-full px-3 py-2 min-h-[100px] md:min-h-[120px] font-mono text-xs md:text-sm
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
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <h3 className="text-base md:text-lg font-semibold text-white mb-3 md:mb-4">Legal Information</h3>

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
                  w-full px-3 py-2 min-h-[80px] text-xs md:text-sm
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
              <p className="text-xs text-gray-400 mt-1">
                Full company address ({companyAddress.length} characters)
              </p>
            </div>

            <div className="mt-6">
              <LegalVariablesPreview
                supportEmail={supportEmail}
                legalEmail={legalEmail}
                privacyEmail={privacyEmail}
                companyName={companyName}
                companyAddress={companyAddress}
                phoneNumber={phoneNumber}
                registrationNumber={registrationNumber}
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
      footer={
        <div className="flex justify-between items-center">
          <div>
            {currentStep > 1 && (
              <Button
                variant="ghost"
                onClick={handlePrevious}
                leftIcon={<ArrowLeft size={16} />}
                disabled={isSubmitting}
              >
                Previous
              </Button>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            {currentStep < STEPS.length ? (
              <Button
                onClick={handleNext}
                rightIcon={<ArrowRight size={16} />}
              >
                Next
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                isLoading={isSubmitting}
                leftIcon={<Edit size={16} />}
              >
                Update Configuration
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        <WizardStepIndicator
          steps={STEPS}
          currentStep={currentStep}
          completedSteps={completedSteps}
          onStepClick={handleStepClick}
        />

        <div className="min-h-[400px]">
          {renderStep()}
        </div>
      </div>
    </Modal>
  );
};

export default EditProjectConfigModal;
