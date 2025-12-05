import React, { useState, useEffect } from 'react';
import { Globe, Upload, X, AlertCircle } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { countries } from '../../data/countries';

interface AddCountryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  duplicateData?: CountryFormData | null;
}

interface CountryFormData {
  id?: string;
  country_code: string;
  country_name: string;
  service_name: string;
  brand_name: string;
  logo_path: string;
  favicon_path: string;
  logo_alt_text: string;
  theme_colors: {
    primary: string;
    secondary: string;
    accent: string;
    success: string;
    error: string;
    warning: string;
  };
  locale_language: string;
  locale_currency: string;
  locale_text_direction: string;
  galaxy_campaign_id: string;
  galaxy_service_id: string;
  galaxy_country_code: string;
  galaxy_language_code: string;
  is_active: boolean;
  is_default: boolean;
  extra_metadata: Record<string, any>;
}

const AddCountryModal: React.FC<AddCountryModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  duplicateData,
}) => {
  const isDuplicateMode = !!duplicateData;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [countryCode, setCountryCode] = useState('');
  const [countryName, setCountryName] = useState('');
  const [serviceName, setServiceName] = useState('Main Service');
  const [brandName, setBrandName] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string>('');
  const [logoAltText, setLogoAltText] = useState('');

  const [primaryColor, setPrimaryColor] = useState('#3B82F6');
  const [secondaryColor, setSecondaryColor] = useState('#8B5CF6');
  const [accentColor, setAccentColor] = useState('#F59E0B');
  const [successColor, setSuccessColor] = useState('#10B981');
  const [errorColor, setErrorColor] = useState('#EF4444');
  const [warningColor, setWarningColor] = useState('#F59E0B');

  const [localeLanguage, setLocaleLanguage] = useState('');
  const [localeCurrency, setLocaleCurrency] = useState('');
  const [localeTextDirection, setLocaleTextDirection] = useState<'ltr' | 'rtl'>('ltr');

  const [galaxyCampaignId, setGalaxyCampaignId] = useState('');
  const [galaxyServiceId, setGalaxyServiceId] = useState('');
  const [galaxyCountryCode, setGalaxyCountryCode] = useState('');
  const [galaxyLanguageCode, setGalaxyLanguageCode] = useState('');

  const [isActive, setIsActive] = useState(true);
  const [isDefault, setIsDefault] = useState(false);
  const [extraMetadata, setExtraMetadata] = useState('{}');

  useEffect(() => {
    if (isOpen && duplicateData) {
      setCountryCode(duplicateData.country_code + '_COPY');
      setCountryName(duplicateData.country_name + ' (Copy)');
      setServiceName(duplicateData.service_name);
      setBrandName(duplicateData.brand_name);
      setLogoPreview(duplicateData.logo_path);
      setFaviconPreview(duplicateData.favicon_path);
      setLogoAltText(duplicateData.logo_alt_text);
      setPrimaryColor(duplicateData.theme_colors.primary);
      setSecondaryColor(duplicateData.theme_colors.secondary);
      setAccentColor(duplicateData.theme_colors.accent);
      setSuccessColor(duplicateData.theme_colors.success);
      setErrorColor(duplicateData.theme_colors.error);
      setWarningColor(duplicateData.theme_colors.warning);
      setLocaleLanguage(duplicateData.locale_language);
      setLocaleCurrency(duplicateData.locale_currency);
      setLocaleTextDirection(duplicateData.locale_text_direction as 'ltr' | 'rtl');
      setGalaxyCampaignId(duplicateData.galaxy_campaign_id || '');
      setGalaxyServiceId(duplicateData.galaxy_service_id || '');
      setGalaxyCountryCode(duplicateData.galaxy_country_code || '');
      setGalaxyLanguageCode(duplicateData.galaxy_language_code || '');
      setIsActive(false);
      setIsDefault(false);
      setExtraMetadata(JSON.stringify(duplicateData.extra_metadata || {}, null, 2));
    } else if (isOpen && !duplicateData) {
      resetForm();
    }
  }, [isOpen, duplicateData]);

  const resetForm = () => {
    setCountryCode('');
    setCountryName('');
    setServiceName('Main Service');
    setBrandName('');
    setLogoFile(null);
    setLogoPreview('');
    setFaviconFile(null);
    setFaviconPreview('');
    setLogoAltText('');
    setPrimaryColor('#3B82F6');
    setSecondaryColor('#8B5CF6');
    setAccentColor('#F59E0B');
    setSuccessColor('#10B981');
    setErrorColor('#EF4444');
    setWarningColor('#F59E0B');
    setLocaleLanguage('');
    setLocaleCurrency('');
    setLocaleTextDirection('ltr');
    setGalaxyCampaignId('');
    setGalaxyServiceId('');
    setGalaxyCountryCode('');
    setGalaxyLanguageCode('');
    setIsActive(true);
    setIsDefault(false);
    setExtraMetadata('{}');
    setErrors({});
    setHasUnsavedChanges(false);
  };

  const handleClose = () => {
    if (hasUnsavedChanges && !isSubmitting) {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to close?');
      if (!confirmed) return;
    }
    resetForm();
    onClose();
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setFile: React.Dispatch<React.SetStateAction<File | null>>,
    setPreview: React.Dispatch<React.SetStateAction<string>>
  ) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }

      setFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
      setHasUnsavedChanges(true);
    }
  };

  const handleRemoveFile = (
    setFile: React.Dispatch<React.SetStateAction<File | null>>,
    setPreview: React.Dispatch<React.SetStateAction<string>>
  ) => {
    setFile(null);
    setPreview('');
    setHasUnsavedChanges(true);
  };

  const uploadFile = async (file: File, folder: string): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `countries/${folder}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('tournament-image-bucket')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Error uploading file:', uploadError);
        toast.error(`Error uploading ${folder}: ${uploadError.message}`);
        return null;
      }

      const { data } = supabase.storage
        .from('tournament-image-bucket')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error in file upload:', error);
      toast.error(`Failed to upload ${folder}`);
      return null;
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!countryCode.trim()) {
      newErrors.country_code = 'Country code is required';
    } else if (!/^[A-Z]{2}(_COPY)?$/.test(countryCode.toUpperCase())) {
      newErrors.country_code = 'Country code must be 2 uppercase letters';
    }

    if (!countryName.trim()) {
      newErrors.country_name = 'Country name is required';
    }

    if (!serviceName.trim()) {
      newErrors.service_name = 'Service name is required';
    }

    if (!brandName.trim()) {
      newErrors.brand_name = 'Brand name is required';
    }

    if (!logoPreview && !logoFile) {
      newErrors.logo = 'Logo is required';
    }

    if (!faviconPreview && !faviconFile) {
      newErrors.favicon = 'Favicon is required';
    }

    if (!logoAltText.trim()) {
      newErrors.logo_alt_text = 'Logo alt text is required';
    }

    const hexPattern = /^#[0-9A-Fa-f]{6}$/;
    if (!hexPattern.test(primaryColor)) newErrors.primary_color = 'Invalid hex color';
    if (!hexPattern.test(secondaryColor)) newErrors.secondary_color = 'Invalid hex color';
    if (!hexPattern.test(accentColor)) newErrors.accent_color = 'Invalid hex color';
    if (!hexPattern.test(successColor)) newErrors.success_color = 'Invalid hex color';
    if (!hexPattern.test(errorColor)) newErrors.error_color = 'Invalid hex color';
    if (!hexPattern.test(warningColor)) newErrors.warning_color = 'Invalid hex color';

    if (!localeLanguage.trim()) {
      newErrors.locale_language = 'Locale language is required';
    }

    if (!localeCurrency.trim()) {
      newErrors.locale_currency = 'Locale currency is required';
    }

    if (!galaxyCampaignId.trim()) {
      newErrors.galaxy_campaign_id = 'Galaxy Campaign ID is required';
    }

    if (!galaxyServiceId.trim()) {
      newErrors.galaxy_service_id = 'Galaxy Service ID is required';
    }

    if (!galaxyCountryCode.trim()) {
      newErrors.galaxy_country_code = 'Galaxy Country Code is required';
    }

    if (!galaxyLanguageCode.trim()) {
      newErrors.galaxy_language_code = 'Galaxy Language Code is required';
    }

    try {
      JSON.parse(extraMetadata);
    } catch {
      newErrors.extra_metadata = 'Invalid JSON format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: existingConfig } = await supabase
        .from('country_configurations')
        .select('country_code')
        .eq('country_code', countryCode.toUpperCase())
        .maybeSingle();

      if (existingConfig) {
        toast.error('A country with this code already exists');
        setErrors({ country_code: 'Country code already exists' });
        setIsSubmitting(false);
        return;
      }

      let logoUrl = logoPreview;
      let faviconUrl = faviconPreview;

      if (logoFile) {
        const uploadedLogoUrl = await uploadFile(logoFile, 'logos');
        if (!uploadedLogoUrl) {
          setIsSubmitting(false);
          return;
        }
        logoUrl = uploadedLogoUrl;
      }

      if (faviconFile) {
        const uploadedFaviconUrl = await uploadFile(faviconFile, 'favicons');
        if (!uploadedFaviconUrl) {
          setIsSubmitting(false);
          return;
        }
        faviconUrl = uploadedFaviconUrl;
      }

      const { error } = await supabase.from('country_configurations').insert({
        country_code: countryCode.toUpperCase(),
        country_name: countryName.trim(),
        service_name: serviceName.trim(),
        brand_name: brandName.trim(),
        logo_path: logoUrl,
        favicon_path: faviconUrl,
        logo_alt_text: logoAltText.trim(),
        theme_colors: {
          primary: primaryColor,
          secondary: secondaryColor,
          accent: accentColor,
          success: successColor,
          error: errorColor,
          warning: warningColor,
        },
        locale_language: localeLanguage.trim(),
        locale_currency: localeCurrency.trim(),
        locale_text_direction: localeTextDirection,
        galaxy_campaign_id: galaxyCampaignId.trim(),
        galaxy_service_id: galaxyServiceId.trim(),
        galaxy_country_code: galaxyCountryCode.trim(),
        galaxy_language_code: galaxyLanguageCode.trim(),
        is_active: isActive,
        is_default: isDefault,
        extra_metadata: JSON.parse(extraMetadata),
      });

      if (error) throw error;

      toast.success(`Country configuration ${isDuplicateMode ? 'duplicated' : 'created'} successfully`);
      resetForm();
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error creating country configuration:', error);
      toast.error(error.message || 'Failed to create country configuration');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isDuplicateMode ? 'Duplicate Country Configuration' : 'Add New Country Configuration'}
      size="2xl"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} isLoading={isSubmitting}>
            {isDuplicateMode ? 'Create Duplicate' : 'Create Configuration'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Basic Information
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Country Code"
              value={countryCode}
              onChange={(e) => {
                setCountryCode(e.target.value.toUpperCase());
                setHasUnsavedChanges(true);
              }}
              placeholder="MA"
              maxLength={10}
              error={errors.country_code}
              required
            />
            <Input
              label="Country Name"
              value={countryName}
              onChange={(e) => {
                setCountryName(e.target.value);
                setHasUnsavedChanges(true);
              }}
              placeholder="Morocco"
              error={errors.country_name}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Service Name"
              value={serviceName}
              onChange={(e) => {
                setServiceName(e.target.value);
                setHasUnsavedChanges(true);
              }}
              placeholder="Main Service"
              error={errors.service_name}
              required
            />
            <Input
              label="Brand Name"
              value={brandName}
              onChange={(e) => {
                setBrandName(e.target.value);
                setHasUnsavedChanges(true);
              }}
              placeholder="My Gaming Brand"
              error={errors.brand_name}
              required
            />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Branding Assets</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Logo <span className="text-error-500">*</span>
              </label>
              <div className="space-y-2">
                {logoPreview ? (
                  <div className="relative">
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="w-full h-32 object-contain bg-dark-200 rounded-lg border border-dark-100"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(setLogoFile, setLogoPreview)}
                      className="absolute top-2 right-2 p-1 bg-error-600 rounded-full hover:bg-error-700"
                    >
                      <X className="h-4 w-4 text-white" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-dark-100 rounded-lg cursor-pointer hover:border-primary-500 transition-colors">
                    <Upload className="h-8 w-8 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-400">Upload Logo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, setLogoFile, setLogoPreview)}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
              {errors.logo && <p className="text-sm text-error-500 mt-1">{errors.logo}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Favicon <span className="text-error-500">*</span>
              </label>
              <div className="space-y-2">
                {faviconPreview ? (
                  <div className="relative">
                    <img
                      src={faviconPreview}
                      alt="Favicon preview"
                      className="w-full h-32 object-contain bg-dark-200 rounded-lg border border-dark-100"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(setFaviconFile, setFaviconPreview)}
                      className="absolute top-2 right-2 p-1 bg-error-600 rounded-full hover:bg-error-700"
                    >
                      <X className="h-4 w-4 text-white" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-dark-100 rounded-lg cursor-pointer hover:border-primary-500 transition-colors">
                    <Upload className="h-8 w-8 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-400">Upload Favicon</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, setFaviconFile, setFaviconPreview)}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
              {errors.favicon && <p className="text-sm text-error-500 mt-1">{errors.favicon}</p>}
            </div>
          </div>
          <Input
            label="Logo Alt Text"
            value={logoAltText}
            onChange={(e) => {
              setLogoAltText(e.target.value);
              setHasUnsavedChanges(true);
            }}
            placeholder="Company Logo"
            error={errors.logo_alt_text}
            required
          />
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Theme Colors</h3>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Primary', value: primaryColor, setValue: setPrimaryColor, error: 'primary_color' },
              { label: 'Secondary', value: secondaryColor, setValue: setSecondaryColor, error: 'secondary_color' },
              { label: 'Accent', value: accentColor, setValue: setAccentColor, error: 'accent_color' },
              { label: 'Success', value: successColor, setValue: setSuccessColor, error: 'success_color' },
              { label: 'Error', value: errorColor, setValue: setErrorColor, error: 'error_color' },
              { label: 'Warning', value: warningColor, setValue: setWarningColor, error: 'warning_color' },
            ].map((color) => (
              <div key={color.label}>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {color.label} <span className="text-error-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <div
                    className="w-10 h-10 rounded border border-dark-100 flex-shrink-0"
                    style={{ backgroundColor: color.value }}
                  />
                  <Input
                    value={color.value}
                    onChange={(e) => {
                      color.setValue(e.target.value);
                      setHasUnsavedChanges(true);
                    }}
                    placeholder="#3B82F6"
                    pattern="^#[0-9A-Fa-f]{6}$"
                    error={errors[color.error]}
                    required
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Locale Configuration</h3>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Language"
              value={localeLanguage}
              onChange={(e) => {
                setLocaleLanguage(e.target.value);
                setHasUnsavedChanges(true);
              }}
              placeholder="fr-FR"
              error={errors.locale_language}
              required
            />
            <Input
              label="Currency"
              value={localeCurrency}
              onChange={(e) => {
                setLocaleCurrency(e.target.value);
                setHasUnsavedChanges(true);
              }}
              placeholder="MAD"
              error={errors.locale_currency}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Text Direction <span className="text-error-500">*</span>
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="ltr"
                  checked={localeTextDirection === 'ltr'}
                  onChange={(e) => {
                    setLocaleTextDirection(e.target.value as 'ltr' | 'rtl');
                    setHasUnsavedChanges(true);
                  }}
                  className="text-primary-500 focus:ring-primary-500"
                />
                <span className="text-gray-300">Left to Right (LTR)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="rtl"
                  checked={localeTextDirection === 'rtl'}
                  onChange={(e) => {
                    setLocaleTextDirection(e.target.value as 'ltr' | 'rtl');
                    setHasUnsavedChanges(true);
                  }}
                  className="text-primary-500 focus:ring-primary-500"
                />
                <span className="text-gray-300">Right to Left (RTL)</span>
              </label>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Galaxy API Integration</h3>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Campaign ID"
              value={galaxyCampaignId}
              onChange={(e) => {
                setGalaxyCampaignId(e.target.value);
                setHasUnsavedChanges(true);
              }}
              placeholder="campaign_12345"
              error={errors.galaxy_campaign_id}
              required
            />
            <Input
              label="Service ID"
              value={galaxyServiceId}
              onChange={(e) => {
                setGalaxyServiceId(e.target.value);
                setHasUnsavedChanges(true);
              }}
              placeholder="service_12345"
              error={errors.galaxy_service_id}
              required
            />
            <Input
              label="Country Code"
              value={galaxyCountryCode}
              onChange={(e) => {
                setGalaxyCountryCode(e.target.value);
                setHasUnsavedChanges(true);
              }}
              placeholder="MA"
              error={errors.galaxy_country_code}
              required
            />
            <Input
              label="Language Code"
              value={galaxyLanguageCode}
              onChange={(e) => {
                setGalaxyLanguageCode(e.target.value);
                setHasUnsavedChanges(true);
              }}
              placeholder="fr"
              error={errors.galaxy_language_code}
              required
            />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Status & Settings</h3>
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => {
                  setIsActive(e.target.checked);
                  setHasUnsavedChanges(true);
                }}
                className="rounded text-primary-500 focus:ring-primary-500"
              />
              <span className="text-gray-300">Active</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => {
                  setIsDefault(e.target.checked);
                  setHasUnsavedChanges(true);
                }}
                className="rounded text-primary-500 focus:ring-primary-500"
              />
              <span className="text-gray-300">Set as Default Country</span>
              {isDefault && (
                <span className="text-xs text-warning-400 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Only one country can be default
                </span>
              )}
            </label>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Extra Metadata (Optional)</h3>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              JSON Configuration
            </label>
            <textarea
              value={extraMetadata}
              onChange={(e) => {
                setExtraMetadata(e.target.value);
                setHasUnsavedChanges(true);
              }}
              className="w-full h-32 px-3 py-2 bg-dark-200 border border-dark-100 rounded-lg text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder='{"key": "value"}'
            />
            {errors.extra_metadata && (
              <p className="text-sm text-error-500 mt-1">{errors.extra_metadata}</p>
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default AddCountryModal;
