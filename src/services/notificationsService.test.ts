import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  confirmBroadcastImage,
  presignBroadcastImage,
  sendBroadcast,
  uploadBroadcastImageFile,
} from './notificationsService';

const ORIGINAL_FETCH = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
  vi.restoreAllMocks();
});

describe('sendBroadcast', () => {
  it('POSTs the required target audience with the broadcast', async () => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ success: true, data: {} }), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    ) as typeof fetch;

    await sendBroadcast('staff-token', {
      type: 'system_announcement',
      title: 'Order has been approved',
      body: 'Your order is ready for pickup.',
      audience: 'customers',
    });

    const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(String(url)).toContain('/notifications/broadcast');
    expect((init as RequestInit).method).toBe('POST');
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      type: 'system_announcement',
      title: 'Order has been approved',
      body: 'Your order is ready for pickup.',
      audience: 'customers',
    });
    expect(new Headers((init as RequestInit).headers).get('Authorization')).toBe('Bearer staff-token');
  });
});

describe('broadcast image upload', () => {
  it('uses the server-confirmed public image URL flow', async () => {
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        success: true,
        data: { uploadUrl: 'https://storage.example/upload', r2Key: 'broadcast-banners/eid.png' },
      }), { status: 201, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response('', { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        success: true,
        data: { publicUrl: 'https://cdn.example/broadcast-banners/eid.png' },
      }), { status: 201, headers: { 'Content-Type': 'application/json' } })) as typeof fetch;

    const presigned = await presignBroadcastImage('staff-token', {
      contentType: 'image/png',
      originalFileName: 'eid.png',
    });
    await uploadBroadcastImageFile(presigned.uploadUrl, new File(['image'], 'eid.png', { type: 'image/png' }));
    const confirmed = await confirmBroadcastImage('staff-token', presigned.r2Key);

    const calls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls;
    expect(String(calls[0][0])).toContain('/notifications/broadcast-images/presign');
    expect(JSON.parse((calls[0][1] as RequestInit).body as string)).toEqual({
      contentType: 'image/png',
      originalFileName: 'eid.png',
    });
    expect(calls[1][0]).toBe('https://storage.example/upload');
    expect(new Headers((calls[1][1] as RequestInit).headers).get('Content-Type')).toBe('image/png');
    expect(String(calls[2][0])).toContain('/notifications/broadcast-images/confirm');
    expect(JSON.parse((calls[2][1] as RequestInit).body as string)).toEqual({
      r2Key: 'broadcast-banners/eid.png',
    });
    expect(confirmed.publicUrl).toBe('https://cdn.example/broadcast-banners/eid.png');
  });
});
