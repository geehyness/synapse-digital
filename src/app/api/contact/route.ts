// src/app/api/contact/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { writeClient, client } from '@/lib/sanity';
import { logSanityInteraction } from '@/lib/sanityLogger';
import { groq } from 'next-sanity';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const id = searchParams.get('id');
  const status = searchParams.get('status');

  try {
    let query: string;
    let params: { [key: string]: any } = {};
    let message: string;

    if (id) {
      query = groq`*[_type == "contact" && _id == $id][0]`;
      params = { id };
      message = `Fetching contact message with ID: ${id}`;
    } else if (status) {
      query = groq`*[_type == "contact" && status == $status] | order(sentAt desc)`;
      params = { status };
      message = `Fetching contact messages with status: ${status}`;
    } else {
      query = groq`*[_type == "contact"] | order(sentAt desc)`;
      message = 'Fetching all contact messages.';
    }

    const contacts = await client.fetch(query, params);

    await logSanityInteraction(
      'fetch',
      `Successfully fetched contact messages. ${message}`,
      'contact',
      id || 'all/filtered',
      'api-get',
      true,
      {
        query: query,
        // Corrected: Nest 'params' and 'resultCount' within the 'payload' field
        payload: {
          requestParams: params, // Renamed for clarity within payload
          resultCount: Array.isArray(contacts) ? contacts.length : (contacts ? 1 : 0)
        }
      }
    );

    return NextResponse.json(contacts, { status: 200 });
  } catch (error: any) {
    console.error('Error in GET /api/contact:', error);
    let errorMessage = 'Failed to fetch contact messages.';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'object' && error !== null && 'message' in error) {
      errorMessage = (error as any).message;
    }

    await logSanityInteraction(
      'error',
      `Failed to fetch contact messages: ${errorMessage}`,
      'contact',
      id || 'all/filtered',
      'api-get',
      false,
      {
        query: searchParams.toString(),
        errorDetails: errorMessage
      }
    );

    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}

// POST function to create a new contact message
export async function POST(req: NextRequest) {
  let contactId: string | undefined;

  try {
    const { name, email, phone, subject, message } = await req.json();

    if (!name || !email || !subject || !message) {
      await logSanityInteraction(
        'error',
        'Missing required fields for contact message submission.',
        'contact',
        undefined,
        'client-submit',
        false,
        { payload: { name, email, subject, message }, errorDetails: 'Missing fields' }
      );
      return NextResponse.json(
        { message: 'Missing required fields: name, email, subject, and message are required.' },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      await logSanityInteraction(
        'error',
        'Invalid email format for contact message submission.',
        'contact',
        undefined,
        'client-submit',
        false,
        { payload: { name, email, subject, message }, errorDetails: 'Invalid email format' }
      );
      return NextResponse.json(
        { message: 'Invalid email format.' },
        { status: 400 }
      );
    }

    const newContactMessage = {
      _type: 'contact',
      name,
      email,
      phone: phone || null,
      subject,
      message,
      sentAt: new Date().toISOString(),
      status: 'new',
    };

    const createdDocument = await writeClient.create(newContactMessage);
    contactId = createdDocument._id;

    await logSanityInteraction(
      'create',
      `New contact message from ${name} (${email}) - Subject: "${subject}".`,
      'contact',
      contactId,
      'client-submit',
      true,
      { payload: newContactMessage }
    );

    return NextResponse.json(
      { message: 'Contact message sent successfully!', data: createdDocument },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error submitting contact message:', error);
    let errorMessage = 'Failed to submit contact message.';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'object' && error !== null && 'message' in error) {
      errorMessage = (error as any).message;
    }

    await logSanityInteraction(
      'error',
      `Failed to submit contact message: ${errorMessage}`,
      'contact',
      contactId,
      'client-submit',
      false,
      { errorDetails: errorMessage, payload: req.json ? await req.json().catch(() => ({})) : {} }
    );

    return NextResponse.json(
      { message: errorMessage },
      { status: 500 }
    );
  }
}

// PUT function to update a contact message
export async function PUT(req: NextRequest) {
  let contactId: string | undefined;
  try {
    const { _id, ...updates } = await req.json();

    if (!_id) {
      await logSanityInteraction(
        'error',
        'Contact ID (_id) is required for updating a contact message.',
        'contact',
        undefined,
        'api-put',
        false,
        { payload: updates, errorDetails: 'Missing _id' }
      );
      return NextResponse.json(
        { message: 'Contact ID (_id) is required for updating.' },
        { status: 400 }
      );
    }

    contactId = _id;

    if (updates.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updates.email)) {
      await logSanityInteraction(
        'error',
        `Invalid email format provided for contact update for ID: ${contactId}.`,
        'contact',
        contactId,
        'api-put',
        false,
        { payload: updates, errorDetails: 'Invalid email format' }
      );
      return NextResponse.json(
        { message: 'Invalid email format provided for update.' },
        { status: 400 }
      );
    }

    const updatedDocument = await writeClient.patch(contactId!) // Keep the non-null assertion for TypeScript safety
      .set(updates)
      .commit();

    await logSanityInteraction(
      'update',
      `Updated contact message with ID: ${contactId}. Fields: ${Object.keys(updates).join(', ')}.`,
      'contact',
      contactId,
      'api-put',
      true,
      { payload: updates, newValue: updatedDocument } // Corrected: changed 'newDocumentState' to 'newValue'
    );

    return NextResponse.json(
      { message: 'Contact message updated successfully!', data: updatedDocument },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error in PUT /api/contact:', error);
    let errorMessage = 'Failed to update contact message.';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'object' && error !== null && 'message' in error) {
      errorMessage = (error as any).message;
    }

    await logSanityInteraction(
      'error',
      `Failed to update contact message for ID ${contactId || 'unknown'}: ${errorMessage}`,
      'contact',
      contactId,
      'api-put',
      false,
      { errorDetails: errorMessage, payload: req.json ? await req.json().catch(() => ({})) : {} }
    );

    return NextResponse.json(
      { message: errorMessage },
      { status: 500 }
    );
  }
}