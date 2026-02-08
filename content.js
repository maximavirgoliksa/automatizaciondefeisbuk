// --- CONFIGURACIÓN ---
const CONFIG = {
  minDelay: 2000, // Tiempo mínimo de espera (ms)
  maxDelay: 5000, // Tiempo máximo de espera (ms)
  autoScroll: true // Si debe bajar automáticamente para cargar más amigos
};

let isRunning = false;
let deletedCount = 0;

// --- INTERFAZ GRÁFICA (UI) ---
function createUI() {
  const div = document.createElement('div');
  div.style.position = 'fixed';
  div.style.bottom = '20px';
  div.style.right = '20px';
  div.style.backgroundColor = '#222';
  div.style.color = 'white';
  div.style.padding = '15px';
  div.style.borderRadius = '10px';
  div.style.zIndex = '99999';
  div.style.boxShadow = '0 4px 10px rgba(0,0,0,0.5)';
  div.style.fontSize = '14px';
  div.style.fontFamily = 'Arial, sans-serif';

  div.innerHTML = `
    <h3 style="margin:0 0 10px 0; font-size:16px;">Limpiador FB</h3>
    <div id="statusText" style="margin-bottom:10px; color:#aaa;">Listo para empezar</div>
    <div style="margin-bottom:10px;">Eliminados: <span id="counter">0</span></div>
    <button id="btnStart" style="background:#28a745; border:none; color:white; padding:8px 15px; border-radius:5px; cursor:pointer; margin-right:5px;">Iniciar</button>
    <button id="btnStop" style="background:#dc3545; border:none; color:white; padding:8px 15px; border-radius:5px; cursor:pointer;">Detener</button>
  `;

  document.body.appendChild(div);

  document.getElementById('btnStart').onclick = startProcess;
  document.getElementById('btnStop').onclick = stopProcess;
}

// --- UTILIDADES ---
function updateStatus(text) {
  const el = document.getElementById('statusText');
  if (el) el.innerText = text;
  console.log(`[Bot]: ${text}`);
}

function randomDelay() {
  // Genera un tiempo aleatorio entre minDelay y maxDelay para parecer humano
  const ms = Math.floor(Math.random() * (CONFIG.maxDelay - CONFIG.minDelay + 1) + CONFIG.minDelay);
  return new Promise(resolve => setTimeout(resolve, ms));
}

function stopProcess() {
  isRunning = false;
  updateStatus("Detenido por el usuario.");
}

// --- LÓGICA PRINCIPAL ---
async function startProcess() {
  if (isRunning) return;
  isRunning = true;
  updateStatus("Buscando botones...");

  // Bucle principal
  while (isRunning) {
    // 1. Buscar botones de opciones (los tres puntos) en la lista de amigos visible
    // Buscamos botones que tengan aria-label con palabras clave comunes
    const allButtons = Array.from(document.querySelectorAll('div[aria-label="More"], div[aria-label="Más"], div[aria-label="Acciones"], div[aria-label="Options"]'));
    
    // Filtramos botones que ya procesamos (para no volver a clickearlos)
    // Nota: Esto es básico, simplemente tomamos el primero disponible que esté visible
    const targetBtn = allButtons.find(btn => btn.offsetParent !== null); 

    if (!targetBtn) {
      updateStatus("No hay más amigos visibles. Bajando...");
      window.scrollTo(0, document.body.scrollHeight);
      await randomDelay();
      
      // Si después de bajar no hay nuevos, paramos
      const newCheck = document.querySelector('div[aria-label="More"], div[aria-label="Más"]');
      if(!newCheck) {
        updateStatus("Fin de la lista o error de selector.");
        isRunning = false;
        break;
      }
      continue;
    }

    try {
      // 2. Clic en "Más"
      targetBtn.scrollIntoView({block: "center", behavior: "smooth"});
      await randomDelay(); 
      targetBtn.click();
      await randomDelay();

      // 3. Buscar "Eliminar" en el menú desplegable
      // Usamos XPath para buscar texto específico en los items del menú
      const menuItems = Array.from(document.querySelectorAll('div[role="menuitem"], span[dir="auto"]'));
      const unfriendBtn = menuItems.find(el => {
        const t = el.textContent.toLowerCase();
        return t.includes('unfriend') || t.includes('eliminar') || t.includes('cancelar amistad');
      });

      if (unfriendBtn) {
        unfriendBtn.click();
        updateStatus("Confirmando eliminación...");
        await randomDelay();

        // 4. Confirmar en el modal
        const confirmBtn = document.querySelector('div[aria-label="Confirm"], div[aria-label="Confirmar"]');
        if (confirmBtn) {
          confirmBtn.click();
          deletedCount++;
          document.getElementById('counter').innerText = deletedCount;
          updateStatus(`Amigo eliminado (${deletedCount})`);
          
          // Esperar a que desaparezca el modal y se actualice la lista
          await new Promise(r => setTimeout(r, 4000));
          
          // Opcional: Eliminar el elemento del DOM visualmente para que el script no lo vuelva a ver
          // (Aunque Facebook suele refrescar la lista dinámicamente)
          targetBtn.closest('div[data-visualcompletion]').remove(); 
        } else {
          updateStatus("No se encontró botón Confirmar. Saltando...");
          // Clic fuera para cerrar menú si falló
          document.body.click();
        }
      } else {
        updateStatus("No es amigo o opción no encontrada. Saltando...");
        // Clic fuera para cerrar menú
        document.body.click();
        // Ocultamos este botón para no volver a probarlo
        targetBtn.style.display = 'none';
      }

    } catch (e) {
      console.error(e);
      updateStatus("Error: " + e.message);
      // Intentar recuperarse
      await randomDelay();
    }
  }
}

// Iniciar la UI cuando cargue la página
window.addEventListener('load', () => {
  setTimeout(createUI, 2000);
});

// Respaldo por si el evento load ya pasó
if (document.readyState === 'complete') {
  createUI();
}