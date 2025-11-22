'use client';

import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Play, 
  Pause, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Mail,
  Workflow,
  Zap,
  BarChart3,
  Users,
  FileText,
  Bell,
  Activity,
  Plus,
  Edit,
  Trash2,
  Loader2
} from 'lucide-react';
import { useToast } from '@/components/ui/toast';

interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  workflowType: string;
  documentType: string;
  isActive: boolean;
  instances: any[];
  _count: {
    instances: number;
  };
}

interface AutomationTrigger {
  id: string;
  name: string;
  triggerType: string;
  isActive: boolean;
  lastTriggered: string | null;
  triggerCount: number;
}

interface PendingApproval {
  id: string;
  stepName: string;
  instance: {
    documentId: string;
    documentType: string;
    workflowDef: {
      name: string;
    };
  };
  dueDate: string | null;
  createdAt: string;
  documentDetails: any;
}

interface NotificationStats {
  pending: number;
  sent: number;
  failed: number;
  total: number;
}

export default function AutomationDashboard() {
  const { showToast } = useToast();
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([]);
  const [triggers, setTriggers] = useState<AutomationTrigger[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [notificationStats, setNotificationStats] = useState<NotificationStats>({
    pending: 0,
    sent: 0,
    failed: 0,
    total: 0
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchAutomationData();
  }, []);

  const fetchAutomationData = async () => {
    try {
      setLoading(true);

      const [workflowsRes, triggersRes, approvalsRes, notificationsRes] = await Promise.all([
        fetch('/api/automation/workflows'),
        fetch('/api/automation/triggers'),
        fetch('/api/automation/approvals?approverId=current-user'), // In real app, get from auth
        fetch('/api/automation/notifications')
      ]);

      const [workflowsData, triggersData, approvalsData, notificationsData] = await Promise.all([
        workflowsRes.json(),
        triggersRes.json(),
        approvalsRes.json(),
        notificationsRes.json()
      ]);

      if (workflowsRes.ok) setWorkflows(workflowsData.workflows || []);
      if (triggersRes.ok) setTriggers(triggersData.triggers || []);
      if (approvalsRes.ok) setPendingApprovals(approvalsData.approvals || []);
      
      if (notificationsRes.ok) {
        const notifications = notificationsData.notifications || [];
        const stats = notifications.reduce((acc: any, notif: any) => {
          acc[notif.status.toLowerCase()]++;
          acc.total++;
          return acc;
        }, { pending: 0, sent: 0, failed: 0, total: 0 });
        setNotificationStats(stats);
      }
    } catch (error) {
      console.error('Error fetching automation data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprovalAction = async (stepId: string, action: string, comments?: string) => {
    try {
      const response = await fetch('/api/automation/approvals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stepId,
          action,
          comments: comments || '',
          approverId: 'current-user' // In real app, get from auth
        }),
      });

      if (response.ok) {
        // Refresh approvals
        showToast('success', `Approval ${action === 'APPROVE' ? 'approved' : 'rejected'} successfully`);
        fetchAutomationData();
      } else {
        const error = await response.json();
        showToast('error', `Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error processing approval:', error);
      showToast('error', 'Failed to process approval');
    }
  };

  const toggleWorkflow = async (workflowId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/automation/workflows/${workflowId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !isActive }),
      });

      if (response.ok) {
        fetchAutomationData();
      }
    } catch (error) {
      console.error('Error toggling workflow:', error);
    }
  };

  const processNotifications = async () => {
    try {
      const response = await fetch('/api/automation/notifications/process', {
        method: 'PUT'
      });

      if (response.ok) {
        fetchAutomationData();
      }
    } catch (error) {
      console.error('Error processing notifications:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-wujha-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Procurement Automation</h1>
        <p className="mt-2 text-gray-600">
          Manage automated workflows, approvals, and notifications for your procurement processes
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Workflow className="h-8 w-8 text-wujha-info" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">Active Workflows</h3>
              <p className="text-2xl font-bold text-wujha-info">
                {workflows.filter(w => w.isActive).length}
              </p>
              <p className="text-sm text-gray-500">
                {workflows.length} total workflows
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">Pending Approvals</h3>
              <p className="text-2xl font-bold text-yellow-600">
                {pendingApprovals.length}
              </p>
              <p className="text-sm text-gray-500">
                Require your action
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Zap className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">Active Triggers</h3>
              <p className="text-2xl font-bold text-purple-600">
                {triggers.filter(t => t.isActive).length}
              </p>
              <p className="text-sm text-gray-500">
                {triggers.length} total triggers
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Bell className="h-8 w-8 text-wujha-primary" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">Notifications</h3>
              <p className="text-2xl font-bold text-wujha-primary">
                {notificationStats.pending}
              </p>
              <p className="text-sm text-gray-500">
                {notificationStats.total} total
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', name: 'Overview', icon: BarChart3 },
            { id: 'workflows', name: 'Workflows', icon: Workflow },
            { id: 'approvals', name: 'Approvals', icon: CheckCircle },
            { id: 'triggers', name: 'Triggers', icon: Zap },
            { id: 'notifications', name: 'Notifications', icon: Bell }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`${
                activeTab === tab.id
                  ? 'border-wujha-primary text-wujha-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
              <tab.icon className="h-4 w-4 mr-2" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'approvals' && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Pending Approvals</h2>
            <p className="text-sm text-gray-500">
              Documents waiting for your approval
            </p>
          </div>
          <div className="divide-y divide-gray-200">
            {pendingApprovals.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <CheckCircle className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No pending approvals</h3>
                <p className="mt-1 text-sm text-gray-500">
                  All caught up! No documents are waiting for your approval.
                </p>
              </div>
            ) : (
              pendingApprovals.map((approval) => (
                <div key={approval.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-gray-900">
                        {approval.instance.workflowDef.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {approval.instance.documentType} - {approval.instance.documentId}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Step: {approval.stepName}
                      </p>
                      {approval.documentDetails && (
                        <div className="mt-2 text-sm text-gray-600">
                          {approval.instance.documentType === 'PR' && (
                            <p>Amount: {approval.documentDetails.estimatedCost} OMR</p>
                          )}
                          {approval.instance.documentType === 'PO' && (
                            <p>Vendor: {approval.documentDetails.vendor?.nameEn}</p>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleApprovalAction(approval.id, 'APPROVED')}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          const comments = prompt('Rejection reason:');
                          if (comments) {
                            handleApprovalAction(approval.id, 'REJECTED', comments);
                          }
                        }}
                        className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'workflows' && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium text-gray-900">Workflow Definitions</h2>
              <p className="text-sm text-gray-500">
                Manage automated approval workflows
              </p>
            </div>
            <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-wujha-primary hover:bg-wujha-primary-hover">
              <Plus className="h-4 w-4 mr-2" />
              New Workflow
            </button>
          </div>
          <div className="divide-y divide-gray-200">
            {workflows.map((workflow) => (
              <div key={workflow.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <h3 className="text-sm font-medium text-gray-900">
                        {workflow.name}
                      </h3>
                      <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        workflow.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {workflow.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {workflow.description}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Type: {workflow.workflowType} • Document: {workflow.documentType} • 
                      Instances: {workflow._count.instances}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => toggleWorkflow(workflow.id, workflow.isActive)}
                      className={`inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md ${
                        workflow.isActive
                          ? 'text-red-700 bg-red-100 hover:bg-red-200'
                          : 'text-green-700 bg-green-100 hover:bg-green-200'
                      }`}
                    >
                      {workflow.isActive ? (
                        <>
                          <Pause className="h-4 w-4 mr-1" />
                          Disable
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-1" />
                          Enable
                        </>
                      )}
                    </button>
                    <button className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium text-gray-900">Notification Management</h2>
              <p className="text-sm text-gray-500">
                Monitor and manage automated notifications
              </p>
            </div>
            <button
              onClick={processNotifications}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-wujha-primary hover:bg-wujha-primary-hover"
            >
              <Activity className="h-4 w-4 mr-2" />
              Process Queue
            </button>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-yellow-50 rounded-lg p-4">
                <div className="flex items-center">
                  <Clock className="h-8 w-8 text-yellow-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-yellow-900">Pending</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {notificationStats.pending}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-green-900">Sent</p>
                    <p className="text-2xl font-bold text-green-600">
                      {notificationStats.sent}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-red-50 rounded-lg p-4">
                <div className="flex items-center">
                  <XCircle className="h-8 w-8 text-red-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-red-900">Failed</p>
                    <p className="text-2xl font-bold text-red-600">
                      {notificationStats.failed}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-wujha-info/10 rounded-lg p-4">
                <div className="flex items-center">
                  <Mail className="h-8 w-8 text-wujha-info" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-wujha-info">Total</p>
                    <p className="text-2xl font-bold text-wujha-info">
                      {notificationStats.total}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
