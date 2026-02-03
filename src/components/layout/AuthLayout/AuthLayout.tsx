import type { ReactElement, ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps): ReactElement {
  return (
    <div className="min-h-screen flex">
      {/* Left side - Warehouse Image with overlay */}
      <div className="hidden lg:flex lg:w-1/2 relative">
        <div
          className="absolute inset-0 bg-gray-800"
          style={{
            backgroundImage: `url('/images/signin-img.svg')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {/* Dark overlay for better text readability */}
          <div className="absolute inset-0 bg-black/30" />
        </div>

        {/* Quote overlay */}
        <div className="relative z-10 flex flex-col justify-end p-12 text-white">
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

      {/* Right side - Form content on orange background */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-brand-500">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  );
}
