/**
 * Indian Railways - Kavach AI Track Integrity & Sensor Diagnostics Hub Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  const runDiagnosticsBtn = document.getElementById('runDiagnosticsBtn');
  const openWorkOrderModalBtn = document.getElementById('openWorkOrderModalBtn');
  const createWorkOrderModal = document.getElementById('createWorkOrderModal');
  const trackWorkOrderForm = document.getElementById('trackWorkOrderForm');
  const workOrdersList = document.getElementById('workOrdersList');

  // Toast Function
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

  window.closeModal = function(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  };

  if (runDiagnosticsBtn) {
    runDiagnosticsBtn.addEventListener('click', () => {
      showToast('Initiating automated track sensor & RFID array diagnostic scan...', 'info');
      setTimeout(() => {
        const tagEl = document.getElementById('rfidTagCount');
        if (tagEl) tagEl.textContent = '1,482 / 1,482 (100%)';
        showToast('✓ Diagnostic Complete: All 1,482 RFID Track Tags Verified Active & Healthy!', 'success');
      }, 1500);
    });
  }

  if (openWorkOrderModalBtn && createWorkOrderModal) {
    openWorkOrderModalBtn.addEventListener('click', () => {
      createWorkOrderModal.classList.remove('hidden');
    });
  }

  if (trackWorkOrderForm) {
    trackWorkOrderForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = document.getElementById('defectTitleInput').value.trim();
      const loc = document.getElementById('defectLocationInput').value.trim();
      const priority = document.getElementById('defectPriorityInput').value;

      if (!title || !loc) return;

      const id = Math.floor(900 + Math.random() * 100);
      const card = document.createElement('div');
      card.className = 'p-4 rounded-xl bg-slate-900/70 border border-emerald-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fadeIn';
      card.innerHTML = `
        <div>
          <div class="flex items-center gap-2">
            <span class="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/40 uppercase">${priority}</span>
            <span class="text-sm font-bold text-white">Work Order #${id}: ${title}</span>
          </div>
          <p class="text-xs text-slate-400 mt-1">Location: ${loc} • Reported Just Now</p>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <button onclick="dispatchCrew(this, '${id}', '${loc}')" class="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow transition-all cursor-pointer">
            Dispatch Crew
          </button>
          <button onclick="resolveWorkOrder(this, '${id}')" class="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold border border-emerald-500/40 transition-all cursor-pointer">
            Mark Resolved
          </button>
        </div>
      `;

      if (workOrdersList) workOrdersList.prepend(card);
      window.closeModal('createWorkOrderModal');
      showToast(`Work Order #${id} logged and dispatched to track maintenance unit.`, 'success');
      trackWorkOrderForm.reset();
    });
  }

  window.dispatchCrew = function(btn, id, loc) {
    btn.textContent = 'Crew En Route';
    btn.className = 'px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold cursor-default';
    btn.disabled = true;
    showToast(`S&T Track Repair Crew Dispatched to ${loc} for Work Order #${id}.`, 'success');
  };

  window.resolveWorkOrder = function(btn, id) {
    const card = btn.closest('div.p-4');
    if (card) {
      card.style.opacity = '0';
      card.style.transform = 'translateY(-10px)';
      card.style.transition = 'all 0.3s ease';
      setTimeout(() => card.remove(), 300);
    }
    showToast(`Work Order #${id} marked RESOLVED & verified healthy.`, 'success');
  };
});
