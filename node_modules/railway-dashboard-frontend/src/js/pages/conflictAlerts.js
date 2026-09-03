/**
 * Indian Railways - Conflict Alerts & Anti-SPAD Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  window.showToast = function(msg, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `px-4 py-3 rounded-2xl border backdrop-blur-xl text-xs font-semibold shadow-2xl flex items-center gap-2.5 transition-all transform translate-y-2 opacity-0 max-w-md`;
    
    if (type === 'success') {
      toast.className += ' bg-emerald-950/90 border-emerald-500/50 text-emerald-200';
      toast.innerHTML = `<i class="fa-solid fa-circle-check text-emerald-400 text-sm"></i> <span>${msg}</span>`;
    } else if (type === 'error') {
      toast.className += ' bg-red-950/90 border-red-500/50 text-red-200';
      toast.innerHTML = `<i class="fa-solid fa-triangle-exclamation text-red-400 text-sm"></i> <span>${msg}</span>`;
    } else {
      toast.className += ' bg-slate-900/95 border-blue-500/40 text-blue-200';
      toast.innerHTML = `<i class="fa-solid fa-circle-info text-blue-400 text-sm"></i> <span>${msg}</span>`;
    }

    container.appendChild(toast);
    setTimeout(() => toast.classList.remove('translate-y-2', 'opacity-0'), 10);
    setTimeout(() => {
      toast.classList.add('opacity-0', 'translate-y-2');
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  };
});
