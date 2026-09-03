/**
 * Indian Railways - Kavach Notifications Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  window.showToast = function(msg, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `px-4 py-3.5 rounded-2xl border-2 text-xs font-bold shadow-2xl flex items-center gap-3 transition-all transform translate-y-2 opacity-0 max-w-md bg-white`;
    
    if (type === 'success') {
      toast.className += ' bg-[#F0FDF4] border-[#138808] text-[#064E3B]';
      toast.innerHTML = `<i class="fa-solid fa-circle-check text-[#138808] text-base shrink-0"></i> <span class="font-extrabold text-[#064E3B] text-xs">${msg}</span>`;
    } else if (type === 'error') {
      toast.className += ' bg-[#FEF2F2] border-[#DC2626] text-[#7F1D1D]';
      toast.innerHTML = `<i class="fa-solid fa-triangle-exclamation text-[#DC2626] text-base shrink-0"></i> <span class="font-extrabold text-[#7F1D1D] text-xs">${msg}</span>`;
    } else {
      toast.className += ' bg-[#EAF3F8] border-[#12355B] text-[#12355B]';
      toast.innerHTML = `<i class="fa-solid fa-circle-info text-[#12355B] text-base shrink-0"></i> <span class="font-extrabold text-[#12355B] text-xs">${msg}</span>`;
    }

    container.appendChild(toast);
    setTimeout(() => toast.classList.remove('translate-y-2', 'opacity-0'), 10);
    setTimeout(() => {
      toast.classList.add('opacity-0', 'translate-y-2');
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  };
});
