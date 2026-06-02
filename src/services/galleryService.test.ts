import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createGalleryAdvert,
  createGalleryItem,
  getAuthedGallery,
  getGalleryClaims,
  getPublicGallery,
  getPublicGalleryAdverts,
  getPublicGallerySales,
  presignGalleryClaim,
  presignGalleryItemMedia,
  presignPublicGalleryClaim,
  reviewGalleryClaim,
  submitAuthedAnonymousClaim,
  submitAuthedCarPurchaseAttempt,
  submitPublicAnonymousClaim,
  submitPublicCarPurchaseAttempt,
  updateGalleryAdvert,
  updateGalleryItem,
} from './galleryService';

const ORIGINAL_FETCH = globalThis.fetch;

function mockFetch(body: unknown, status = 200): void {
  globalThis.fetch = vi.fn(() =>
    Promise.resolve(
      new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      }),
    ),
  ) as typeof fetch;
}

function lastCall(): { url: string; init: RequestInit } {
  const calls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls;
  const [url, init] = calls.at(-1) ?? ['', {}];
  return { url: String(url), init: init as RequestInit };
}

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
  vi.restoreAllMocks();
});

describe('public gallery reads', () => {
  it('getPublicGallery does not send Authorization', async () => {
    mockFetch({
      success: true,
      data: { anonymousGoods: [], sales: [], cars: [], adverts: [] },
    });
    await getPublicGallery();
    const { url, init } = lastCall();
    expect(url).toContain('/public/gallery');
    expect(new Headers(init.headers).has('Authorization')).toBe(false);
  });

  it('getPublicGallery forwards limitPerSection', async () => {
    mockFetch({ success: true, data: { anonymousGoods: [], sales: [], cars: [], adverts: [] } });
    await getPublicGallery(8);
    expect(lastCall().url).toContain('limitPerSection=8');
  });

  it('getPublicGalleryAdverts hits the adverts path', async () => {
    mockFetch({ success: true, data: [] });
    await getPublicGalleryAdverts(5);
    const { url } = lastCall();
    expect(url).toContain('/public/gallery/adverts');
    expect(url).toContain('limit=5');
  });

  it('getPublicGallerySales hits the sales path', async () => {
    mockFetch({ success: true, data: [] });
    await getPublicGallerySales();
    expect(lastCall().url).toContain('/public/gallery/sales');
  });
});

describe('public gallery write flows', () => {
  it('presignPublicGalleryClaim POSTs without Authorization but with cf-turnstile-response', async () => {
    mockFetch({ success: true, data: { uploadUrl: 'u', r2Key: 'k', uploadToken: 't' } });
    await presignPublicGalleryClaim({ contentType: 'image/png' }, 'cf-token-1');
    const { url, init } = lastCall();
    expect(url).toContain('/public/gallery/claims/presign');
    expect(init.method).toBe('POST');
    const headers = new Headers(init.headers);
    expect(headers.has('Authorization')).toBe(false);
    expect(headers.get('cf-turnstile-response')).toBe('cf-token-1');
  });

  it('submitPublicAnonymousClaim encodes the tracking number + attaches turnstile header', async () => {
    mockFetch({ success: true, data: { item: {}, claim: {}, ticket: {} } });
    await submitPublicAnonymousClaim(
      'TRK 1/2',
      {
        itemId: '00000000-0000-0000-0000-000000000001',
        fullName: 'Ada',
        email: 'a@b.test',
        phone: '+234555',
        uploadToken: 'tok',
        proofR2Keys: ['k1'],
      },
      'cf-token-2',
    );
    const { url, init } = lastCall();
    expect(url).toContain('/public/gallery/anonymous/TRK%201%2F2/claim');
    expect(init.method).toBe('POST');
    expect(new Headers(init.headers).get('cf-turnstile-response')).toBe('cf-token-2');
  });

  it('submitPublicCarPurchaseAttempt hits the purchase-attempt path + attaches turnstile header', async () => {
    mockFetch({ success: true, data: { item: {}, claim: {}, ticket: {} } });
    await submitPublicCarPurchaseAttempt(
      'CAR1',
      { fullName: 'Ada', email: 'a@b.test', phone: '+234555' },
      'cf-token-3',
    );
    const { url, init } = lastCall();
    expect(url).toContain('/public/gallery/cars/CAR1/purchase-attempt');
    expect(new Headers(init.headers).get('cf-turnstile-response')).toBe('cf-token-3');
  });
});

describe('authed gallery reads', () => {
  it('getAuthedGallery sends Authorization', async () => {
    mockFetch({
      success: true,
      data: { anonymousGoods: [], sales: [], cars: [], adverts: [], myClaims: [] },
    });
    await getAuthedGallery('token');
    const { url, init } = lastCall();
    expect(url).toContain('/gallery');
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer token');
  });
});

describe('authed gallery uploads + writes', () => {
  it('presignGalleryClaim sends Authorization', async () => {
    mockFetch({ success: true, data: { uploadUrl: 'u', r2Key: 'k', uploadToken: 't' } });
    await presignGalleryClaim('token', { contentType: 'image/png' });
    const { url, init } = lastCall();
    expect(url).toContain('/gallery/claims/presign');
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer token');
  });

  it('presignGalleryItemMedia hits the staff media path', async () => {
    mockFetch({ success: true, data: { uploadUrl: 'u', r2Key: 'k', uploadToken: 't' } });
    await presignGalleryItemMedia('token', { contentType: 'image/png' });
    expect(lastCall().url).toContain('/gallery/items/media/presign');
  });

  it('submitAuthedAnonymousClaim posts to /gallery/anonymous/:tracking/claim', async () => {
    mockFetch({ success: true, data: { item: {}, claim: {}, ticket: {} } });
    await submitAuthedAnonymousClaim('token', 'TRK1', {
      itemId: '00000000-0000-0000-0000-000000000001',
      uploadToken: 't',
      proofR2Keys: ['k'],
    });
    expect(lastCall().url).toContain('/gallery/anonymous/TRK1/claim');
  });

  it('submitAuthedCarPurchaseAttempt posts to /gallery/cars/:tracking/purchase-attempt', async () => {
    mockFetch({ success: true, data: { item: {}, claim: {}, ticket: {} } });
    await submitAuthedCarPurchaseAttempt('token', 'CAR1', { message: 'hi' });
    expect(lastCall().url).toContain('/gallery/cars/CAR1/purchase-attempt');
  });
});

describe('staff gallery items + adverts', () => {
  it('createGalleryItem POSTs the payload', async () => {
    mockFetch({ success: true, data: { id: 'g1', title: 'X' } });
    await createGalleryItem('token', { itemType: 'advert', title: 'X' });
    const { url, init } = lastCall();
    expect(url).toContain('/gallery/items');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ itemType: 'advert', title: 'X' });
  });

  it('createGalleryAdvert POSTs the advert payload', async () => {
    mockFetch({ success: true, data: { id: 'g2', title: 'Ad' } });
    await createGalleryAdvert('token', { title: 'Ad' });
    expect(lastCall().url).toContain('/gallery/adverts');
  });

  it('updateGalleryItem PATCHes by id', async () => {
    mockFetch({ success: true, data: { id: 'g1' } });
    await updateGalleryItem('token', 'g1', { title: 'New' });
    const { url, init } = lastCall();
    expect(url).toContain('/gallery/items/g1');
    expect(init.method).toBe('PATCH');
  });

  it('updateGalleryAdvert PATCHes by id', async () => {
    mockFetch({ success: true, data: { id: 'g2' } });
    await updateGalleryAdvert('token', 'g2', { title: 'New' });
    const { url, init } = lastCall();
    expect(url).toContain('/gallery/adverts/g2');
    expect(init.method).toBe('PATCH');
  });
});

describe('staff claim review queue', () => {
  it('getGalleryClaims forwards query params', async () => {
    mockFetch({ success: true, data: [] });
    await getGalleryClaims('token', {
      status: 'pending',
      claimType: 'ownership',
      itemTrackingNumber: 'TRK1',
      limit: 25,
    });
    const { url } = lastCall();
    expect(url).toContain('/gallery/claims');
    expect(url).toContain('status=pending');
    expect(url).toContain('claimType=ownership');
    expect(url).toContain('itemTrackingNumber=TRK1');
    expect(url).toContain('limit=25');
  });

  it('reviewGalleryClaim PATCHes the decision', async () => {
    mockFetch({ success: true, data: { item: {}, claim: {}, shipment: null } });
    await reviewGalleryClaim('token', 'claim1', { decision: 'approve' });
    const { url, init } = lastCall();
    expect(url).toContain('/gallery/claims/claim1/review');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body as string)).toEqual({ decision: 'approve' });
  });

  it('surfaces 409 already-reviewed conflicts', async () => {
    mockFetch({ message: 'Already reviewed' }, 409);
    await expect(
      reviewGalleryClaim('token', 'claim1', { decision: 'approve' }),
    ).rejects.toThrow('Already reviewed');
  });
});
