export const clerkAppearance = {
  variables: {
    colorPrimary: '#f97316',
    fontFamily: 'var(--font-sans)',
    borderRadius: '12px',
  },
  elements: {
    rootBox: 'w-full',
    cardBox: 'w-full',
    card: 'w-full bg-transparent shadow-none border-0 p-0',
    main: 'w-full',
    headerTitle: 'text-xl font-semibold text-gray-900',
    headerSubtitle: 'text-sm text-gray-600',
    form: 'space-y-5',
    formFieldLabel: 'block text-sm font-medium text-gray-700 mb-1.5',
    formFieldInput:
      'w-full rounded-lg border border-[#DDE5E9] px-4 py-2.5 text-sm text-gray-900 placeholder:text-sm placeholder:text-gray-400 bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent hover:border-gray-400',
    formButtonPrimary:
      'w-full inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 bg-brand-500 text-white hover:bg-brand-600 focus:ring-brand-500 px-4 py-2.5 text-sm',
    footerActionLink: 'font-medium text-brand-500 hover:text-brand-600',
    dividerLine: 'bg-gray-200',
    dividerText: 'text-xs text-gray-500',
    socialButtonsBlockButton:
      'border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors',
    socialButtonsBlockButtonText: 'text-sm text-gray-700',
  },
};
