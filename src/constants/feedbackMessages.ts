export const FEEDBACK_MESSAGES = {
  common: {
    unexpectedError: 'Something went wrong. Please try again.',
    networkError: 'Unable to connect right now. Please check your connection and try again.',
    forbidden: 'You do not have permission to perform this action.',
    notFound: 'The requested resource is not available.',
    unavailable: 'Service is temporarily unavailable. Please try again shortly.',
  },
  support: {
    ticketsLoadError: 'Unable to load your support tickets right now. Please try again.',
    ticketCreateError: 'We could not submit your support ticket. Please try again.',
    ticketCreateSuccess: 'Ticket submitted successfully. Our support team will follow up soon.',
  },
  tracking: {
    fetchError: 'We could not retrieve tracking details right now. Please try again.',
  },
} as const;
