import type { ReactElement, ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps): ReactElement {
  return (
    <div className="min-h-screen flex">
      {/* Left side - Image/Background */}
      <div className="hidden lg:flex lg:w-1/2 relative">
        {/* Placeholder gradient background - replace with actual warehouse image */}
        <div
          className="absolute inset-0 bg-gradient-to-br from-brand-600 via-brand-500 to-orange-400"
          style={{
            backgroundImage: `url('/images/warehouse-bg.jpg')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {/* Overlay for when image is added */}
          <div className="absolute inset-0 bg-black/20" />
        </div>

        {/* Branding overlay */}
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <div>
            <h1 className="text-4xl font-bold font-display">GlobalXpress</h1>
            <p className="mt-2 text-lg text-white/80">International Freight Agent</p>
          </div>

          <div className="max-w-md">
            <blockquote className="text-xl font-medium italic">
              "Delivering excellence across borders, connecting businesses worldwide."
            </blockquote>
            <p className="mt-4 text-white/70">
              Your trusted partner in global logistics and freight forwarding.
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Form content */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  );
}
