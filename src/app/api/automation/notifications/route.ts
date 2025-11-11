import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';


// GET /api/automation/notifications - Get notification queue
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: any = {};
    
    if (status) {
      where.status = status;
    }

    if (type) {
      where.type = type;
    }

    const notifications = await prisma.notificationQueue.findMany({
      where,
      take: limit,
      orderBy: {
        scheduledAt: 'desc'
      }
    });

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

// POST /api/automation/notifications - Queue new notification
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      type,
      recipient,
      subject,
      body: messageBody,
      templateData,
      scheduledAt
    } = body;

    if (!type || !recipient || !subject || !messageBody) {
      return NextResponse.json(
        { error: 'Type, recipient, subject, and body are required' },
        { status: 400 }
      );
    }

    const notification = await prisma.notificationQueue.create({
      data: {
        type,
        recipient,
        subject,
        body: messageBody,
        templateData: templateData || {},
        scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date()
      }
    });

    return NextResponse.json(notification, { status: 201 });
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    );
  }
}

// POST /api/automation/notifications/process - Process pending notifications
export async function PUT(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10');

    // Get pending notifications
    const pendingNotifications = await prisma.notificationQueue.findMany({
      where: {
        status: 'PENDING',
        scheduledAt: {
          lte: new Date()
        },
        retryCount: {
          lt: prisma.notificationQueue.fields.maxRetries
        }
      },
      take: limit,
      orderBy: {
        scheduledAt: 'asc'
      }
    });

    const results = [];

    for (const notification of pendingNotifications) {
      try {
        let success = false;
        let errorMessage = null;

        // Process notification based on type
        switch (notification.type) {
          case 'EMAIL':
            success = await sendEmail(notification);
            break;
          case 'SMS':
            success = await sendSMS(notification);
            break;
          case 'SYSTEM':
            success = await createSystemNotification(notification);
            break;
          case 'PUSH':
            success = await sendPushNotification(notification);
            break;
          default:
            errorMessage = `Unsupported notification type: ${notification.type}`;
        }

        if (success) {
          // Mark as sent
          await prisma.notificationQueue.update({
            where: { id: notification.id },
            data: {
              status: 'SENT',
              sentAt: new Date()
            }
          });

          results.push({
            id: notification.id,
            status: 'SENT',
            type: notification.type,
            recipient: notification.recipient
          });
        } else {
          // Increment retry count
          const newRetryCount = notification.retryCount + 1;
          const maxRetries = notification.maxRetries;

          await prisma.notificationQueue.update({
            where: { id: notification.id },
            data: {
              retryCount: newRetryCount,
              status: newRetryCount >= maxRetries ? 'FAILED' : 'PENDING',
              errorMessage: errorMessage || 'Failed to send notification',
              scheduledAt: newRetryCount < maxRetries 
                ? new Date(Date.now() + Math.pow(2, newRetryCount) * 60000) // Exponential backoff
                : notification.scheduledAt
            }
          });

          results.push({
            id: notification.id,
            status: newRetryCount >= maxRetries ? 'FAILED' : 'RETRY',
            type: notification.type,
            recipient: notification.recipient,
            retryCount: newRetryCount,
            error: errorMessage
          });
        }
      } catch (error) {
        console.error(`Error processing notification ${notification.id}:`, error);
        
        await prisma.notificationQueue.update({
          where: { id: notification.id },
          data: {
            retryCount: { increment: 1 },
            errorMessage: error instanceof Error ? error.message : 'Unknown error'
          }
        });

        results.push({
          id: notification.id,
          status: 'ERROR',
          type: notification.type,
          recipient: notification.recipient,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({ 
      processed: results.length,
      results 
    });
  } catch (error) {
    console.error('Error processing notifications:', error);
    return NextResponse.json(
      { error: 'Failed to process notifications' },
      { status: 500 }
    );
  }
}

// Notification delivery functions
async function sendEmail(notification: any): Promise<boolean> {
  try {
    // In production, integrate with email service (SendGrid, AWS SES, etc.)
    // For now, simulate email sending
    console.log('📧 EMAIL SENT:', {
      to: notification.recipient,
      subject: notification.subject,
      body: notification.body,
      templateData: notification.templateData
    });

    // Simulate success/failure for demo
    return Math.random() > 0.1; // 90% success rate
  } catch (error) {
    console.error('Email sending error:', error);
    return false;
  }
}

async function sendSMS(notification: any): Promise<boolean> {
  try {
    // In production, integrate with SMS service (Twilio, AWS SNS, etc.)
    console.log('📱 SMS SENT:', {
      to: notification.recipient,
      body: notification.body
    });

    return Math.random() > 0.05; // 95% success rate
  } catch (error) {
    console.error('SMS sending error:', error);
    return false;
  }
}

async function createSystemNotification(notification: any): Promise<boolean> {
  try {
    // Create in-app notification
    // In production, this would create a user notification record
    console.log('🔔 SYSTEM NOTIFICATION:', {
      user: notification.recipient,
      subject: notification.subject,
      body: notification.body
    });

    return true; // System notifications rarely fail
  } catch (error) {
    console.error('System notification error:', error);
    return false;
  }
}

async function sendPushNotification(notification: any): Promise<boolean> {
  try {
    // In production, integrate with push service (Firebase, Apple Push, etc.)
    console.log('📲 PUSH NOTIFICATION:', {
      to: notification.recipient,
      subject: notification.subject,
      body: notification.body
    });

    return Math.random() > 0.15; // 85% success rate
  } catch (error) {
    console.error('Push notification error:', error);
    return false;
  }
}
