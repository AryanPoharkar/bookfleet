export {};
declare global {
  interface Window {
    Razorpay?: new (options: {
      key: string; subscription_id: string; name: string; description: string;
      prefill: { name: string; email: string }; theme: { color: string };
      handler: (response: { razorpay_payment_id: string; razorpay_subscription_id: string; razorpay_signature: string }) => void;
      modal: { ondismiss: () => void };
    }) => { open: () => void; on: (event: string, callback: () => void) => void };
  }
}
