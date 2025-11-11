'use client';

import { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Bell,
  Users,
  Building,
  Mail,
  Clock,
  Shield,
  Database,
  Workflow,
  Save,
  RefreshCw
} from 'lucide-react';

interface SystemSettings {
  companyName: string;
  companyEmail: string;
  defaultCurrency: string;
  fiscalYearStart: string;
  timeZone: string;
  dateFormat: string;
  enableNotifications: boolean;
  enableEmailAlerts: boolean;
  enableAutomation: boolean;
  enableBudgetControl: boolean;
  requireApprovalForPR: boolean;
  requireApprovalForPO: boolean;
  autoConvertPRtoPO: boolean;
  enableThreeWayMatch: boolean;
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState<SystemSettings>({
    companyName: 'WUJHA HR',
    companyEmail: 'procurement@wujha.com',
    defaultCurrency: 'OMR',
    fiscalYearStart: '01-01',
    timeZone: 'Asia/Muscat',
    dateFormat: 'DD/MM/YYYY',
    enableNotifications: true,
    enableEmailAlerts: true,
    enableAutomation: true,
    enableBudgetControl: true,
    requireApprovalForPR: true,
    requireApprovalForPO: true,
    autoConvertPRtoPO: false,
    enableThreeWayMatch: true
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error saving settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all settings to default?')) {
      setSettings({
        companyName: 'WUJHA HR',
        companyEmail: 'procurement@wujha.com',
        defaultCurrency: 'OMR',
        fiscalYearStart: '01-01',
        timeZone: 'Asia/Muscat',
        dateFormat: 'DD/MM/YYYY',
        enableNotifications: true,
        enableEmailAlerts: true,
        enableAutomation: true,
        enableBudgetControl: true,
        requireApprovalForPR: true,
        requireApprovalForPO: true,
        autoConvertPRtoPO: false,
        enableThreeWayMatch: true
      });
    }
  };

  const tabs = [
    { id: 'general', name: 'General', icon: SettingsIcon },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'workflow', name: 'Workflow', icon: Workflow },
    { id: 'system', name: 'System', icon: Database }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            System Settings
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Configure system preferences and procurement workflow settings
          </p>
        </div>
        <div className="mt-4 flex gap-3 md:ml-4 md:mt-0">
          <button
            onClick={handleReset}
            className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:bg-blue-300"
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  group inline-flex items-center border-b-2 py-4 px-1 text-sm font-medium
                  ${isActive
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }
                `}
              >
                <Icon className={`mr-2 h-5 w-5 ${isActive ? 'text-blue-500' : 'text-gray-400'}`} />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          {/* General Settings */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                  General Configuration
                </h3>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Company Name
                    </label>
                    <input
                      type="text"
                      value={settings.companyName}
                      onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border text-gray-900 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Company Email
                    </label>
                    <input
                      type="email"
                      value={settings.companyEmail}
                      onChange={(e) => setSettings({ ...settings, companyEmail: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border text-gray-900 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Default Currency
                    </label>
                    <select
                      value={settings.defaultCurrency}
                      onChange={(e) => setSettings({ ...settings, defaultCurrency: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border text-gray-900 bg-white"
                    >
                      <option value="OMR">OMR - Omani Rial</option>
                      <option value="USD">USD - US Dollar</option>
                      <option value="EUR">EUR - Euro</option>
                      <option value="GBP">GBP - British Pound</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Time Zone
                    </label>
                    <select
                      value={settings.timeZone}
                      onChange={(e) => setSettings({ ...settings, timeZone: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border text-gray-900 bg-white"
                    >
                      <option value="Asia/Muscat">Asia/Muscat (GMT+4)</option>
                      <option value="Asia/Dubai">Asia/Dubai (GMT+4)</option>
                      <option value="Asia/Riyadh">Asia/Riyadh (GMT+3)</option>
                      <option value="UTC">UTC (GMT+0)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Date Format
                    </label>
                    <select
                      value={settings.dateFormat}
                      onChange={(e) => setSettings({ ...settings, dateFormat: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border text-gray-900 bg-white"
                    >
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Fiscal Year Start
                    </label>
                    <input
                      type="text"
                      placeholder="MM-DD (e.g., 01-01)"
                      value={settings.fiscalYearStart}
                      onChange={(e) => setSettings({ ...settings, fiscalYearStart: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border text-gray-900 bg-white placeholder-gray-400"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notifications Settings */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                  Notification Preferences
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Bell className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Enable Notifications</p>
                        <p className="text-sm text-gray-500">Receive in-app notifications for important events</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSettings({ ...settings, enableNotifications: !settings.enableNotifications })}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        settings.enableNotifications ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          settings.enableNotifications ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Mail className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Email Alerts</p>
                        <p className="text-sm text-gray-500">Send email notifications for approvals and updates</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSettings({ ...settings, enableEmailAlerts: !settings.enableEmailAlerts })}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        settings.enableEmailAlerts ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          settings.enableEmailAlerts ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Workflow Settings */}
          {activeTab === 'workflow' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                  Workflow & Automation
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Workflow className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Enable Automation</p>
                        <p className="text-sm text-gray-500">Automate workflow processes and approvals</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSettings({ ...settings, enableAutomation: !settings.enableAutomation })}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        settings.enableAutomation ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          settings.enableAutomation ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Shield className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Require PR Approval</p>
                        <p className="text-sm text-gray-500">Mandate approval workflow for purchase requisitions</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSettings({ ...settings, requireApprovalForPR: !settings.requireApprovalForPR })}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        settings.requireApprovalForPR ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          settings.requireApprovalForPR ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Shield className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Require PO Approval</p>
                        <p className="text-sm text-gray-500">Mandate approval workflow for purchase orders</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSettings({ ...settings, requireApprovalForPO: !settings.requireApprovalForPO })}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        settings.requireApprovalForPO ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          settings.requireApprovalForPO ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <RefreshCw className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Auto-convert PR to PO</p>
                        <p className="text-sm text-gray-500">Automatically create PO from approved PR</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSettings({ ...settings, autoConvertPRtoPO: !settings.autoConvertPRtoPO })}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        settings.autoConvertPRtoPO ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          settings.autoConvertPRtoPO ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Database className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Enable Three-Way Match</p>
                        <p className="text-sm text-gray-500">Match PO, GRN, and Invoice before payment</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSettings({ ...settings, enableThreeWayMatch: !settings.enableThreeWayMatch })}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        settings.enableThreeWayMatch ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          settings.enableThreeWayMatch ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Building className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Enable Budget Control</p>
                        <p className="text-sm text-gray-500">Enforce budget limits and approvals</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSettings({ ...settings, enableBudgetControl: !settings.enableBudgetControl })}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        settings.enableBudgetControl ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          settings.enableBudgetControl ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* System Settings */}
          {activeTab === 'system' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                  System Information
                </h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-700">Version</span>
                    <span className="text-sm text-gray-900">1.0.0</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-700">Environment</span>
                    <span className="text-sm text-gray-900">Production</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-700">Database</span>
                    <span className="text-sm text-green-600">Connected</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-700">Last Updated</span>
                    <span className="text-sm text-gray-900">{new Date().toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                  Advanced Options
                </h3>
                <div className="space-y-3">
                  <button className="w-full text-left px-4 py-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Clear Cache</p>
                        <p className="text-xs text-gray-500">Remove cached data to improve performance</p>
                      </div>
                      <RefreshCw className="h-5 w-5 text-gray-400" />
                    </div>
                  </button>

                  <button className="w-full text-left px-4 py-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Export Configuration</p>
                        <p className="text-xs text-gray-500">Download current system settings</p>
                      </div>
                      <Database className="h-5 w-5 text-gray-400" />
                    </div>
                  </button>

                  <button className="w-full text-left px-4 py-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">System Diagnostics</p>
                        <p className="text-xs text-gray-500">Run system health check</p>
                      </div>
                      <Shield className="h-5 w-5 text-gray-400" />
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
