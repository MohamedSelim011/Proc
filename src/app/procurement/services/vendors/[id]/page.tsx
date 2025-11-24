'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Edit,
  Building,
  Mail,
  Phone,
  MapPin,
  FileText,
  Calendar,
  Star,
  Award,
  CheckCircle,
  AlertCircle,
  Hash,
  Globe,
  Loader2
} from 'lucide-react';

interface Vendor {
  id: string;
  vendorCode: string;
  nameEn: string;
  nameAr: string;
  crNumber: string;
  taxId: string;
  vatNumber?: string;
  primaryContactName: string;
  email: string;
  mobile: string;
  alternativePhone?: string;
  website?: string;
  address: any;
  bankName?: string;
  bankAccount?: string;
  iban?: string;
  contactEmail?: string;
  contactPhone?: string;
  businessType: string;
  yearEstablished: number;
  numberOfEmployees: number;
  omanizationPercentage?: number;
  status: string;
  performanceScore?: number;
  createdAt: string;
  updatedAt: string;
  categories: Array<{
    category: {
      id: string;
      nameEn: string;
      nameAr: string;
    };
    isPrimary: boolean;
  }>;
  _count?: {
    purchaseOrders: number;
    invoices: number;
    evaluations: number;
  };
}

export default function VendorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [vendorId, setVendorId] = useState<string>('');

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
      setLoading(true);
      const response = await fetch(`/api/vendors/${vendorId}`);

      if (response.ok) {
        const data = await response.json();
        setVendor(data);
      } else {
        setError('Vendor not found');
      }
    } catch (error) {
      console.error('Error fetching vendor:', error);
      setError('Failed to load vendor details');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-OM', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'ACTIVE': 'bg-green-100 text-green-800',
      'INACTIVE': 'bg-gray-100 text-gray-800',
      'PENDING': 'bg-yellow-100 text-yellow-800',
      'APPROVED': 'bg-wujha-primary/10 text-wujha-primary',
      'BLACKLISTED': 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin h-12 w-12 text-wujha-primary" />
      </div>
    );
  }

  if (error || !vendor) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
        <Link
          href="/procurement/services/vendors"
          className="mt-4 inline-flex items-center text-sm font-medium text-wujha-primary hover:text-wujha-primary-hover"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Vendors
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/procurement/services/vendors"
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Vendors
        </Link>

        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="h-16 w-16 rounded-full bg-wujha-primary/10 flex items-center justify-center">
              <Building className="h-8 w-8 text-wujha-primary" />
            </div>
            <div className="ml-6">
              <h1 className="text-2xl font-bold text-gray-900">{vendor.nameEn}</h1>
              <p className="text-sm text-gray-500 mt-1">
                {vendor.nameAr} • {vendor.vendorCode}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(vendor.status)}`}>
              {vendor.status}
            </span>
            <Link
              href={`/procurement/services/vendors/${vendorId}/edit`}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-wujha-primary hover:bg-wujha-primary-hover"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Vendor
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FileText className="h-6 w-6 text-wujha-primary" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Purchase Orders</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {vendor._count?.purchaseOrders || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Hash className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Invoices</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {vendor._count?.invoices || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Star className="h-6 w-6 text-yellow-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Evaluations</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {vendor._count?.evaluations || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Award className="h-6 w-6 text-purple-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Performance</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {vendor.performanceScore !== null && vendor.performanceScore !== undefined 
                      ? `${vendor.performanceScore.toFixed(1)}/5` 
                      : '0.0/5'}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - Left Side */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Building className="h-5 w-5 mr-2 text-gray-400" />
              Basic Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Vendor Code</label>
                <p className="mt-1 text-sm text-gray-900">{vendor.vendorCode}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Business Type</label>
                <p className="mt-1 text-sm text-gray-900">{vendor.businessType}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Year Established</label>
                <p className="mt-1 text-sm text-gray-900">{vendor.yearEstablished}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Number of Employees</label>
                <p className="mt-1 text-sm text-gray-900">{vendor.numberOfEmployees}</p>
              </div>
              {vendor.omanizationPercentage !== null && vendor.omanizationPercentage !== undefined && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Omanization</label>
                  <p className="mt-1 text-sm text-gray-900">{vendor.omanizationPercentage}%</p>
                </div>
              )}
            </div>
          </div>

          {/* Legal & Registration Information */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <FileText className="h-5 w-5 mr-2 text-gray-400" />
              Legal & Registration
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Commercial Registration</label>
                <p className="mt-1 text-sm text-gray-900">{vendor.crNumber}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Tax ID</label>
                <p className="mt-1 text-sm text-gray-900">{vendor.taxId}</p>
              </div>
              {vendor.vatNumber && (
                <div>
                  <label className="text-sm font-medium text-gray-500">VAT Number</label>
                  <p className="mt-1 text-sm text-gray-900">{vendor.vatNumber}</p>
                </div>
              )}
            </div>
          </div>

          {/* Address Information */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <MapPin className="h-5 w-5 mr-2 text-gray-400" />
              Address
            </h2>
            <div className="space-y-2 text-sm text-gray-900">
              {vendor.address?.building && <p>{vendor.address.building}</p>}
              {vendor.address?.street && <p>{vendor.address.street}</p>}
              {(vendor.address?.city || vendor.address?.governorate) && (
                <p>
                  {vendor.address.city}
                  {vendor.address.city && vendor.address.governorate && ', '}
                  {vendor.address.governorate}
                </p>
              )}
              {vendor.address?.postalCode && <p>Postal Code: {vendor.address.postalCode}</p>}
              {vendor.address?.country && <p>{vendor.address.country}</p>}
            </div>
          </div>

          {/* Categories */}
          {vendor.categories && vendor.categories.length > 0 && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Categories</h2>
              <div className="flex flex-wrap gap-2">
                {vendor.categories.map((cat, index) => (
                  <span
                    key={index}
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      cat.isPrimary
                        ? 'bg-wujha-primary/10 text-wujha-primary border border-wujha-primary/20'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {cat.category.nameEn}
                    {cat.isPrimary && (
                      <CheckCircle className="ml-1 h-3 w-3" />
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Side - Contact & Meta */}
        <div className="space-y-6">
          {/* Contact Information */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Primary Contact</label>
                <p className="mt-1 text-sm text-gray-900">{vendor.primaryContactName}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 flex items-center">
                  <Mail className="h-4 w-4 mr-1" />
                  Email
                </label>
                <a
                  href={`mailto:${vendor.email}`}
                  className="mt-1 text-sm text-wujha-primary hover:text-wujha-primary-hover"
                >
                  {vendor.email}
                </a>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 flex items-center">
                  <Phone className="h-4 w-4 mr-1" />
                  Mobile
                </label>
                <a
                  href={`tel:${vendor.mobile}`}
                  className="mt-1 text-sm text-wujha-primary hover:text-wujha-primary-hover"
                >
                  {vendor.mobile}
                </a>
              </div>
              {vendor.alternativePhone && (
                <div>
                  <label className="text-sm font-medium text-gray-500 flex items-center">
                    <Phone className="h-4 w-4 mr-1" />
                    Alternative Phone
                  </label>
                  <a
                    href={`tel:${vendor.alternativePhone}`}
                    className="mt-1 text-sm text-wujha-primary hover:text-wujha-primary-hover"
                  >
                    {vendor.alternativePhone}
                  </a>
                </div>
              )}
              {vendor.website && (
                <div>
                  <label className="text-sm font-medium text-gray-500 flex items-center">
                    <Globe className="h-4 w-4 mr-1" />
                    Website
                  </label>
                  <a
                    href={vendor.website.startsWith('http') ? vendor.website : `https://${vendor.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 text-sm text-wujha-primary hover:text-wujha-primary-hover"
                  >
                    {vendor.website}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Contact Person Information */}
          {(vendor.contactEmail || vendor.contactPhone) && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Contact Person Information</h2>
              <div className="space-y-4">
                {vendor.contactEmail && (
                  <div>
                    <label className="text-sm font-medium text-gray-500 flex items-center">
                      <Mail className="h-4 w-4 mr-1" />
                      Contact Email
                    </label>
                    <a
                      href={`mailto:${vendor.contactEmail}`}
                      className="mt-1 text-sm text-wujha-primary hover:text-wujha-primary-hover"
                    >
                      {vendor.contactEmail}
                    </a>
                  </div>
                )}
                {vendor.contactPhone && (
                  <div>
                    <label className="text-sm font-medium text-gray-500 flex items-center">
                      <Phone className="h-4 w-4 mr-1" />
                      Contact Phone
                    </label>
                    <a
                      href={`tel:${vendor.contactPhone}`}
                      className="mt-1 text-sm text-wujha-primary hover:text-wujha-primary-hover"
                    >
                      {vendor.contactPhone}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Banking Information */}
          {(vendor.bankName || vendor.bankAccount || vendor.iban) && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Hash className="h-5 w-5 mr-2 text-gray-400" />
                Banking Information
              </h2>
              <div className="space-y-4">
                {vendor.bankName && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Bank Name</label>
                    <p className="mt-1 text-sm text-gray-900">{vendor.bankName}</p>
                  </div>
                )}
                {vendor.bankAccount && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Bank Account Number</label>
                    <p className="mt-1 text-sm text-gray-900">{vendor.bankAccount}</p>
                  </div>
                )}
                {vendor.iban && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">IBAN</label>
                    <p className="mt-1 text-sm text-gray-900 font-mono">{vendor.iban}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Calendar className="h-5 w-5 mr-2 text-gray-400" />
              Record Information
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500">Created</label>
                <p className="mt-1 text-sm text-gray-900">{formatDate(vendor.createdAt)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Last Updated</label>
                <p className="mt-1 text-sm text-gray-900">{formatDate(vendor.updatedAt)}</p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <Link
                href={`/procurement/purchase-orders/new?vendorId=${vendorId}`}
                className="block w-full text-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Create Purchase Order
              </Link>
              <Link
                href={`/procurement/invoices/new?vendorId=${vendorId}`}
                className="block w-full text-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Create Invoice
              </Link>
              <Link
                href={`/procurement/services/contracts/new?vendorId=${vendorId}`}
                className="block w-full text-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Create Service Contract
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
