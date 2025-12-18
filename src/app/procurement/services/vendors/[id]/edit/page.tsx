'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Building, Mail, Phone, MapPin, FileText, Hash, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { filterArabicCharacters, filterNonArabicCharacters, filterPhoneNumber, validatePhoneNumber } from '@/lib/utils';

interface VendorFormData {
  vendorCode: string;
  nameEn: string;
  nameAr: string;
  email: string;
  mobile: string;
  alternativePhone?: string;
  website?: string;
  taxId: string;
  vatNumber?: string;
  crNumber: string;
  businessType: string;
  yearEstablished: number;
  numberOfEmployees: number;
  omanizationPercentage?: number;
  address: {
    building?: string;
    street?: string;
    city?: string;
    governorate?: string;
    postalCode?: string;
    country?: string;
  };
  bankName?: string;
  bankAccount?: string;
  iban?: string;
  primaryContactName: string;
  contactEmail?: string;
  contactPhone?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  performanceScore?: number;
}

export default function EditVendorPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [vendorId, setVendorId] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<VendorFormData>({
    vendorCode: '',
    nameEn: '',
    nameAr: '',
    email: '',
    mobile: '',
    crNumber: '',
    taxId: '',
    businessType: '',
    yearEstablished: new Date().getFullYear(),
    numberOfEmployees: 0,
    primaryContactName: '',
    address: {
      building: '',
      street: '',
      city: '',
      governorate: '',
      postalCode: '',
      country: 'Oman'
    },
    status: 'ACTIVE',
    performanceScore: 0
  });

  useEffect(() => {
    params.then(p => {
      setVendorId(p.id);
    });
  }, [params]);

  useEffect(() => {
    if (vendorId) {
      fetchVendor();
    }
  }, [vendorId]);

  const fetchVendor = async () => {
    try {
      setLoadingData(true);
      const response = await fetch(`/api/vendors/${vendorId}`);

      if (response.ok) {
        const data = await response.json();
        setFormData({
          vendorCode: data.vendorCode || '',
          nameEn: data.nameEn || '',
          nameAr: data.nameAr || '',
          email: data.email || '',
          mobile: data.mobile || '',
          alternativePhone: data.alternativePhone,
          website: data.website,
          taxId: data.taxId || '',
          vatNumber: data.vatNumber,
          crNumber: data.crNumber || '',
          businessType: data.businessType || '',
          yearEstablished: data.yearEstablished || new Date().getFullYear(),
          numberOfEmployees: data.numberOfEmployees || 0,
          omanizationPercentage: data.omanizationPercentage,
          address: data.address || {
            building: '',
            street: '',
            city: '',
            governorate: '',
            postalCode: '',
            country: 'Oman'
          },
          bankName: data.bankName,
          bankAccount: data.bankAccount,
          iban: data.iban,
          primaryContactName: data.primaryContactName || '',
          contactEmail: data.contactEmail,
          contactPhone: data.contactPhone,
          status: data.status || 'ACTIVE',
          performanceScore: data.performanceScore ?? 0
        });
      } else {
        setErrors({ submit: 'Failed to load vendor data' });
      }
    } catch (error) {
      console.error('Error fetching vendor:', error);
      setErrors({ submit: 'Failed to load vendor data' });
    } finally {
      setLoadingData(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear error when user types
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleAddressChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      address: {
        ...prev.address,
        [field]: value
      }
    }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.vendorCode.trim()) {
      newErrors.vendorCode = 'Vendor code is required';
    }
    if (!formData.nameEn.trim()) {
      newErrors.nameEn = 'Vendor name (English) is required';
    }
    if (!formData.nameAr.trim()) {
      newErrors.nameAr = 'Vendor name (Arabic) is required';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    const mobileError = validatePhoneNumber(formData.mobile);
    if (mobileError) {
      newErrors.mobile = mobileError;
    }
    if (!formData.crNumber || !formData.crNumber.trim()) {
      newErrors.crNumber = 'Commercial Registration number is required';
    }
    if (!formData.taxId || !formData.taxId.trim()) {
      newErrors.taxId = 'Tax ID is required';
    }
    if (!formData.businessType.trim()) {
      newErrors.businessType = 'Business type is required';
    }
    if (!formData.yearEstablished || formData.yearEstablished < 1900) {
      newErrors.yearEstablished = 'Valid year established is required';
    }
    if (!formData.numberOfEmployees || formData.numberOfEmployees < 1) {
      newErrors.numberOfEmployees = 'Number of employees is required';
    }
    if (!formData.primaryContactName.trim()) {
      newErrors.primaryContactName = 'Primary contact name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/vendors/${vendorId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        showToast('success', 'Vendor updated successfully!');
        router.push(`/procurement/services/vendors/${vendorId}`);
      } else {
        showToast('error', data.error || 'Failed to update vendor.');
        setErrors({ submit: data.error || 'Failed to update vendor' });
      }
    } catch (error) {
      showToast('error', 'An error occurred while updating the vendor. Please try again.');
      setErrors({ submit: 'Failed to update vendor. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="animate-spin h-12 w-12 text-wujha-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/procurement/services/vendors/${vendorId}`}
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Vendor Details
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Edit Vendor</h1>
        <p className="mt-1 text-sm text-gray-500">
          Update vendor information for {formData.nameEn}
        </p>
      </div>

      {errors.submit && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-800">{errors.submit}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <Building className="h-5 w-5 mr-2 text-gray-400" />
            Basic Information
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Vendor Code <span className="text-red-500">*</span>
              </label>
              <div className="mt-1 relative">
                <input
                  type="text"
                  value={formData.vendorCode}
                  onChange={(e) => handleInputChange('vendorCode', e.target.value)}
                  disabled
                  className={`block w-full rounded-md shadow-sm sm:text-sm px-3 py-2 border ${
                    errors.vendorCode ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary transition-colors'
                  } text-gray-900 bg-gray-50`}
                  placeholder="e.g., VEN-001"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">Vendor code cannot be changed</p>
              {errors.vendorCode && (
                <p className="mt-1 text-sm text-red-600">{errors.vendorCode}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary transition-colors sm:text-sm px-3 py-2 text-gray-900 bg-white"
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="PENDING">Pending</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Performance Score (0-5)
              </label>
              <input
                type="number"
                min="0"
                max="5"
                step="0.1"
                value={formData.performanceScore ?? 0}
                onChange={(e) => handleInputChange('performanceScore', parseFloat(e.target.value) || 0)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary transition-colors sm:text-sm px-3 py-2 text-gray-900 bg-white"
                placeholder="0.0"
              />
              <p className="mt-1 text-xs text-gray-500">Vendor performance rating from 0 to 5</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Vendor Name (English) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.nameEn}
                onChange={(e) => {
                  // Filter out Arabic characters from the input
                  const filteredValue = filterArabicCharacters(e.target.value);
                  handleInputChange('nameEn', filteredValue);
                }}
                className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm px-3 py-2 border ${
                  errors.nameEn ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary transition-colors'
                } text-gray-900 bg-white`}
                placeholder="Enter vendor name in English"
              />
              {errors.nameEn && (
                <p className="mt-1 text-sm text-red-600">{errors.nameEn}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Only English characters, numbers, and common punctuation are allowed
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Vendor Name (Arabic) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.nameAr}
                onChange={(e) => {
                  // Filter out non-Arabic characters from the input
                  const filteredValue = filterNonArabicCharacters(e.target.value);
                  handleInputChange('nameAr', filteredValue);
                }}
                className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm px-3 py-2 border ${
                  errors.nameAr ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary transition-colors'
                } text-gray-900 bg-white`}
                placeholder="أدخل اسم المورد بالعربية"
                dir="rtl"
              />
              {errors.nameAr && (
                <p className="mt-1 text-sm text-red-600">{errors.nameAr}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Only Arabic characters, numbers, and common punctuation are allowed
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Email <span className="text-red-500">*</span>
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={`block w-full pl-10 rounded-md shadow-sm sm:text-sm px-3 py-2 border ${
                    errors.email ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary transition-colors'
                  } text-gray-900 bg-white`}
                  placeholder="vendor@example.com"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Phone <span className="text-red-500">*</span>
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="tel"
                  value={formData.mobile}
                  onChange={(e) => {
                    // Filter phone number to only allow digits and formatting characters
                    const filteredValue = filterPhoneNumber(e.target.value);
                    handleInputChange('mobile', filteredValue);
                  }}
                  className={`block w-full pl-10 rounded-md shadow-sm sm:text-sm px-3 py-2 border ${
                    errors.mobile ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary transition-colors'
                  } text-gray-900 bg-white`}
                  placeholder="+968 XXXX XXXX"
                />
              </div>
              {errors.mobile && (
                <p className="mt-1 text-sm text-red-600">{errors.mobile}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Enter a valid phone number (minimum 7 digits, digits only)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Alternative Phone
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="tel"
                  value={formData.alternativePhone || ''}
                  onChange={(e) => {
                    // Filter phone number to only allow digits and formatting characters
                    const filteredValue = filterPhoneNumber(e.target.value);
                    handleInputChange('alternativePhone', filteredValue);
                  }}
                  className="block w-full pl-10 rounded-md border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary transition-colors sm:text-sm px-3 py-2 text-gray-900 bg-white"
                  placeholder="+968 XXXX XXXX"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Website
              </label>
              <input
                type="url"
                value={formData.website || ''}
                onChange={(e) => handleInputChange('website', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary transition-colors sm:text-sm px-3 py-2 text-gray-900 bg-white"
                placeholder="https://www.example.com"
              />
            </div>
          </div>
        </div>

        {/* Legal & Registration Information */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <FileText className="h-5 w-5 mr-2 text-gray-400" />
            Legal & Registration Information
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Tax ID (TIN) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.taxId}
                onChange={(e) => handleInputChange('taxId', e.target.value)}
                className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm px-3 py-2 border ${
                  errors.taxId ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary transition-colors'
                } text-gray-900 bg-white`}
                placeholder="Enter tax identification number"
              />
              {errors.taxId && (
                <p className="mt-1 text-sm text-red-600">{errors.taxId}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                VAT Number
              </label>
              <input
                type="text"
                value={formData.vatNumber || ''}
                onChange={(e) => handleInputChange('vatNumber', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary transition-colors sm:text-sm px-3 py-2 text-gray-900 bg-white"
                placeholder="Enter VAT number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Commercial Registration <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.crNumber}
                onChange={(e) => handleInputChange('crNumber', e.target.value)}
                className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm px-3 py-2 border ${
                  errors.crNumber ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary transition-colors'
                } text-gray-900 bg-white`}
                placeholder="Enter CR number"
              />
              {errors.crNumber && (
                <p className="mt-1 text-sm text-red-600">{errors.crNumber}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Business Type <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.businessType}
                onChange={(e) => handleInputChange('businessType', e.target.value)}
                className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm px-3 py-2 border ${
                  errors.businessType ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary transition-colors'
                } text-gray-900 bg-white`}
              >
                <option value="">Select business type</option>
                <option value="SOLE_PROPRIETORSHIP">Sole Proprietorship</option>
                <option value="PARTNERSHIP">Partnership</option>
                <option value="LLC">Limited Liability Company (LLC)</option>
                <option value="JOINT_STOCK">Joint Stock Company</option>
                <option value="BRANCH">Branch Office</option>
                <option value="OTHER">Other</option>
              </select>
              {errors.businessType && (
                <p className="mt-1 text-sm text-red-600">{errors.businessType}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Year Established <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1900"
                max={new Date().getFullYear()}
                value={formData.yearEstablished}
                onChange={(e) => handleInputChange('yearEstablished', parseInt(e.target.value) || 0)}
                className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm px-3 py-2 border ${
                  errors.yearEstablished ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary transition-colors'
                } text-gray-900 bg-white`}
                placeholder="e.g., 2010"
              />
              {errors.yearEstablished && (
                <p className="mt-1 text-sm text-red-600">{errors.yearEstablished}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Number of Employees <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={formData.numberOfEmployees}
                onChange={(e) => handleInputChange('numberOfEmployees', parseInt(e.target.value) || 0)}
                className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm px-3 py-2 border ${
                  errors.numberOfEmployees ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary transition-colors'
                } text-gray-900 bg-white`}
                placeholder="e.g., 50"
              />
              {errors.numberOfEmployees && (
                <p className="mt-1 text-sm text-red-600">{errors.numberOfEmployees}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Omanization Percentage
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={formData.omanizationPercentage || ''}
                onChange={(e) => handleInputChange('omanizationPercentage', parseFloat(e.target.value) || undefined)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary transition-colors sm:text-sm px-3 py-2 text-gray-900 bg-white"
                placeholder="e.g., 15.5"
              />
            </div>
          </div>
        </div>

        {/* Address Information */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <MapPin className="h-5 w-5 mr-2 text-gray-400" />
            Address Information
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Building/Office Number
              </label>
              <input
                type="text"
                value={formData.address.building || ''}
                onChange={(e) => handleAddressChange('building', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary transition-colors sm:text-sm px-3 py-2 text-gray-900 bg-white"
                placeholder="Building number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Street
              </label>
              <input
                type="text"
                value={formData.address.street || ''}
                onChange={(e) => handleAddressChange('street', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary transition-colors sm:text-sm px-3 py-2 text-gray-900 bg-white"
                placeholder="Street name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                City
              </label>
              <input
                type="text"
                value={formData.address.city || ''}
                onChange={(e) => handleAddressChange('city', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary transition-colors sm:text-sm px-3 py-2 text-gray-900 bg-white"
                placeholder="City"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Governorate
              </label>
              <input
                type="text"
                value={formData.address.governorate || ''}
                onChange={(e) => handleAddressChange('governorate', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary transition-colors sm:text-sm px-3 py-2 text-gray-900 bg-white"
                placeholder="Governorate"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Postal Code
              </label>
              <input
                type="text"
                value={formData.address.postalCode || ''}
                onChange={(e) => handleAddressChange('postalCode', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary transition-colors sm:text-sm px-3 py-2 text-gray-900 bg-white"
                placeholder="Postal code"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Country
              </label>
              <input
                type="text"
                value={formData.address.country || ''}
                onChange={(e) => handleAddressChange('country', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary transition-colors sm:text-sm px-3 py-2 text-gray-900 bg-white"
                placeholder="Country"
              />
            </div>
          </div>
        </div>

        {/* Banking Information */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <Hash className="h-5 w-5 mr-2 text-gray-400" />
            Banking Information
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Bank Name
              </label>
              <input
                type="text"
                value={formData.bankName || ''}
                onChange={(e) => handleInputChange('bankName', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary transition-colors sm:text-sm px-3 py-2 text-gray-900 bg-white"
                placeholder="Bank name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Bank Account Number
              </label>
              <input
                type="text"
                value={formData.bankAccount || ''}
                onChange={(e) => handleInputChange('bankAccount', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary transition-colors sm:text-sm px-3 py-2 text-gray-900 bg-white"
                placeholder="Account number"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                IBAN
              </label>
              <input
                type="text"
                value={formData.iban || ''}
                onChange={(e) => handleInputChange('iban', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary transition-colors sm:text-sm px-3 py-2 text-gray-900 bg-white"
                placeholder="OM XX XXXX XXXXXXXXXXXX"
              />
            </div>
          </div>
        </div>

        {/* Contact Person Information */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Contact Person Information
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Contact Person Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.primaryContactName}
                onChange={(e) => handleInputChange('primaryContactName', e.target.value)}
                className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm px-3 py-2 border ${
                  errors.primaryContactName ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary transition-colors'
                } text-gray-900 bg-white`}
                placeholder="Full name"
              />
              {errors.primaryContactName && (
                <p className="mt-1 text-sm text-red-600">{errors.primaryContactName}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Contact Email
              </label>
              <input
                type="email"
                value={formData.contactEmail || ''}
                onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary transition-colors sm:text-sm px-3 py-2 text-gray-900 bg-white"
                placeholder="contact@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Contact Phone
              </label>
              <input
                type="tel"
                value={formData.contactPhone || ''}
                onChange={(e) => {
                  // Filter phone number to only allow digits and formatting characters
                  const filteredValue = filterPhoneNumber(e.target.value);
                  handleInputChange('contactPhone', filteredValue);
                }}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:border-wujha-primary transition-colors sm:text-sm px-3 py-2 text-gray-900 bg-white"
                placeholder="+968 XXXX XXXX"
              />
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3">
          <Link
            href={`/procurement/services/vendors/${vendorId}`}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-wujha-primary hover:bg-wujha-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-wujha-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Updating...' : 'Update Vendor'}
          </button>
        </div>
      </form>
    </div>
  );
}
