export const FEEDBACK_MESSAGES = {
  common: {
    unexpectedError: 'Something went wrong. Please try again.',
    networkError: 'Unable to connect right now. Please check your connection and try again.',
    forbidden: 'You do not have permission to perform this action.',
    notFound: 'The requested resource is not available.',
    unavailable: 'Service is temporarily unavailable. Please try again shortly.',
    rateLimited: 'Too many attempts. Please wait a moment and try again.',
  },
  support: {
    ticketsLoadError: 'Unable to load your support tickets right now. Please try again.',
    ticketCreateError: 'We could not submit your support ticket. Please try again.',
    ticketCreateSuccess: 'Ticket submitted successfully. Our support team will follow up soon.',
    ticketDetailLoadError: 'Unable to load this ticket. Please try again.',
    messageSendError: 'Your message could not be sent. Please try again.',
    ticketClosedError: 'This ticket is closed and can no longer receive messages.',
    statusUpdateSuccess: 'Ticket status updated successfully.',
    statusUpdateError: 'Unable to update ticket status. Please try again.',
    newTicketToast: 'A new support ticket has been created.',
  },
  tracking: {
    fetchError: 'We could not retrieve tracking details right now. Please try again.',
  },
} as const;
