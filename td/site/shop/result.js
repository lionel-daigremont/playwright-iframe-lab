// Shows the payment result sent by the PSP iframe through postMessage.
window.addEventListener('message', (e) => {
  if (e.origin !== 'http://localhost:3101' || e.data?.type !== 'payment-result') return;
  const result = document.getElementById('result');
  if (e.data.status === 'approved') {
    result.className = 'approved';
    result.textContent = `Payment approved. Transaction ID: ${e.data.transactionId}`;
  } else {
    result.className = 'declined';
    result.textContent = 'Payment declined: insufficient funds';
  }
});
