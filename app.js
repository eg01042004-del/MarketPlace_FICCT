import {
  registrar,
  login,
  logout,
  observarAuth
} from "./auth.js";
import {
  publicarProducto,
  obtenerProductos,
  obtenerMisProductos,
  actualizarProducto,
  eliminarProducto,
  subirImagenProducto
} from "./productos.js";

document.addEventListener("DOMContentLoaded", () => {
  const state = {
    user: null,
    modal: { login: false, sell: false },
    section: "home",
    products: [],
    myProducts: [],
    editId: null
  };

  const $ = (id) => document.getElementById(id);

  const ui = {
    loginModal: $("loginModal"),
    sellModal: $("sellModal"),
    deleteModal: $("deleteModal"),
    authArea: $("authArea"),
    userMenu: $("userMenu"),
    userName: $("userNameDisplay"),
    buyGrid: $("buyGrid"),
    recentGrid: $("recentGrid"),
    myGrid: $("myListingsGrid"),
    searchInput: $("searchInput"),
    navLinks: document.querySelectorAll("[data-section]:not(.cat-tab)")
  };

  // 1. BUSCADOR: Limpieza total de autocompletado y valores iniciales
  if (ui.searchInput) {
    ui.searchInput.value = ""; 
    ui.searchInput.setAttribute("autocomplete", "off");
    ui.searchInput.setAttribute("name", "search_" + Math.random().toString(36).slice(2));
  }

  function render() {
    ui.loginModal?.classList.toggle("hidden", !state.modal.login);
    ui.sellModal?.classList.toggle("hidden", !state.modal.sell);

    if (state.user) {
      ui.authArea?.classList.add("hidden");
      ui.userMenu?.classList.remove("hidden");
      if (ui.userName) ui.userName.textContent = state.user.email.split("@")[0];
    } else {
      ui.authArea?.classList.remove("hidden");
      ui.userMenu?.classList.add("hidden");
    }

    document.querySelectorAll(".section").forEach(s => {
      s.classList.add("hidden");
      s.classList.remove("active");
    });

    const active = document.getElementById(`section-${state.section}`);
    active?.classList.remove("hidden");
    active?.classList.add("active");
  }

  function openLogin() {
    state.modal.login = true;
    state.modal.sell = false;
    render();
  }

  function openSell() {
    if (!state.user) return openLogin();
    state.modal.sell = true;
    state.modal.login = false;
    render();
  }

  function closeModals() {
    state.modal.login = false;
    state.modal.sell = false;
    render();
  }

  async function setSection(sec) {
    state.section = sec;
    if (sec === "comprar") await loadProducts();
    if (sec === "vender") await loadMyProducts();
    render();
  }

  ui.navLinks.forEach(link => {
    link.addEventListener("click", async (e) => {
      e.preventDefault();
      await setSection(link.dataset.section);
    });
  });

  $("btnLogin")?.addEventListener("click", openLogin);
  $("modalClose")?.addEventListener("click", closeModals);
  $("sellModalClose")?.addEventListener("click", closeModals);
  $("btnOpenSell")?.addEventListener("click", openSell);

  $("btnLogout")?.addEventListener("click", async () => {
    await logout();
    state.user = null;
    state.myProducts = [];
    $("dropdownMenu")?.classList.remove("open");
    render();
  });

  $("btnEmailLogin")?.addEventListener("click", async () => {
    try {
      const email = $("loginEmail").value.trim();
      const password = $("loginPassword").value.trim();
      if (!email || !password) return;
      await login(email, password);
      closeModals();
      await loadProducts();
    } catch (e) {
      alert("Error: " + e.message);
    }
  });

  // 4. CÁMARA Y PUBLICACIÓN: Gestión de imagen sin cerrar formulario
  $("btnPublish")?.addEventListener("click", async () => {
    try {
      if (!state.user) return openLogin();

      const btn = $("btnPublish");
      const originalText = btn.textContent;
      btn.disabled = true;
      btn.textContent = "Procesando...";

      let imagenFinal = $("prodImage").value.trim();
      const file = $("prodImageFile")?.files?.[0];

      if (file) {
        imagenFinal = await subirImagenProducto(file);
      }

      const producto = {
        nombre: $("prodName").value.trim(),
        precio: $("prodPrice").value,
        categoria: $("prodCategory").value,
        estado: $("prodCondition").value,
        descripcion: $("prodDescription").value.trim(),
        ubicacion: $("prodLocation").value.trim(),
        imagen: imagenFinal,
        telefono: $("prodPhone").value.trim()
      };

      if (!producto.nombre || !producto.precio) {
        btn.disabled = false;
        btn.textContent = originalText;
        return alert("Coloca nombre y precio.");
      }

      if (state.editId) {
        await actualizarProducto(state.editId, producto);
      } else {
        await Array.isArray(producto) ? await publicarProducto(producto[0]) : await publicarProducto(producto);
      }

      limpiarFormulario();
      closeModals();
      await loadProducts();
      await loadMyProducts();
      await setSection("vender");

    } catch (e) {
      console.error(e);
      alert("Error: " + e.message);
    } finally {
      const btn = $("btnPublish");
      if (btn) btn.disabled = false;
    }
  });

  observarAuth(async (user) => {
    state.user = user;
    // Eliminado cualquier código que escribía en searchInput
    if (user) await loadMyProducts();
    render();
  });

  // 2 y 3. EDITAR/ELIMINAR Y PROPAGACIÓN: Listeners restaurados y stopPropagation
  document.addEventListener("click", (e) => {
    const editBtn = e.target.closest("[data-edit]");
    const deleteBtn = e.target.closest("[data-delete]");

    if (editBtn) {
      e.preventDefault();
      e.stopPropagation(); // Evita abrir la tarjeta
      editarProducto(editBtn.dataset.edit);
      return;
    }

    if (deleteBtn) {
      e.preventDefault();
      e.stopPropagation(); // Evita abrir la tarjeta
      borrarProducto(deleteBtn.dataset.delete);
      return;
    }

    const card = e.target.closest(".product-card");
    if (card && card.dataset.id) {
      if (e.target.closest(".product-actions")) return;
      const p = [...state.products, ...state.myProducts].find(
        x => String(x.id) === String(card.dataset.id)
      );
      if (p) openProductModal(p);
      return;
    }

    if (e.target.id === "productModal") closeProductModal();
  });

  function openProductModal(p) {
    $("modalImg").src = p.imagen || "https://via.placeholder.com/400";
    $("modalTitle").textContent = p.nombre || "";
    $("modalPrice").textContent = `Bs ${p.precio || 0}`;
    $("modalDesc").textContent = p.descripcion || "Sin descripción";
    $("modalCat").textContent = p.categoria || "-";
    $("modalState").textContent = p.estado || "-";
    $("modalUb").textContent = p.ubicacion || "-";
    $("productModal").classList.remove("hidden");
    $("productModal").classList.add("show");
  }

  function closeProductModal() {
    $("productModal").classList.remove("show");
    setTimeout(() => $("productModal").classList.add("hidden"), 200);
  }

  $("closeProductModal")?.addEventListener("click", closeProductModal);

  async function loadProducts() {
    const data = await obtenerProductos();
    state.products = data || [];
    if (ui.buyGrid) ui.buyGrid.innerHTML = state.products.map(renderCard).join("");
    if (ui.recentGrid) ui.recentGrid.innerHTML = state.products.slice(0, 6).map(renderCard).join("");
  }

  async function loadMyProducts() {
    if (!state.user) return;
    const data = await obtenerMisProductos();
    state.myProducts = data || [];
    if (ui.myGrid) ui.myGrid.innerHTML = state.myProducts.map(renderCard).join("");
  }

  function editarProducto(id) {
    const p = state.myProducts.find(x => String(x.id) === String(id));
    if (!p) return;
    state.editId = p.id;
    $("prodName").value = p.nombre || "";
    $("prodPrice").value = p.precio || "";
    $("prodCategory").value = p.categoria || "Otros";
    $("prodCondition").value = p.estado || "Usado";
    $("prodDescription").value = p.descripcion || "";
    $("prodLocation").value = p.ubicacion || "";
    $("prodImage").value = p.imagen || "";
    $("prodPhone").value = p.telefono || "";
    $("btnPublish").textContent = "Guardar cambios";
    openSell();
  }

  // 2. ELIMINAR: Uso de deleteModal sin alerts nativos
  async function borrarProducto(id) {
    const dModal = $("deleteModal");
    const confirmBtn = $("confirmDelete");
    const cancelBtn = $("cancelDelete");

    dModal.classList.remove("hidden");

    cancelBtn.onclick = () => dModal.classList.add("hidden");

    confirmBtn.onclick = async () => {
      try {
        confirmBtn.disabled = true;
        confirmBtn.textContent = "Eliminando...";
        await eliminarProducto(id);
        dModal.classList.add("hidden");
        await loadProducts();
        await loadMyProducts();
      } catch (e) {
        console.error(e);
      } finally {
        confirmBtn.disabled = false;
        confirmBtn.textContent = "Eliminar";
      }
    };
  }

  function renderCard(p) {
    const isMine = state.user && p.user_id === state.user.id;
    return `
      <div class="product-card" data-id="${p.id}">
        <img class="product-img" src="${p.imagen || 'https://via.placeholder.com/300'}" onerror="this.src='https://via.placeholder.com/300'">
        <div class="product-info">
          <div class="product-category">${p.categoria || "General"}</div>
          <div class="product-title">${p.nombre || "Sin nombre"}</div>
          <div class="product-price">Bs ${p.precio || 0}</div>
          <div class="product-meta"><span>📍 ${p.ubicacion || "Bolivia"}</span></div>
          ${isMine ? `
            <div class="product-actions">
              <button type="button" class="btn-edit" data-edit="${p.id}">Editar</button>
              <button type="button" class="btn-delete" data-delete="${p.id}">Eliminar</button>
            </div>` : ""}
        </div>
      </div>`;
  }

  loadProducts();
  setSection("home");
});

function limpiarFormulario() {
  const ids = ["prodName", "prodPrice", "prodDescription", "prodImage", "prodPhone", "prodImageFile"];
  ids.forEach(id => { if (document.getElementById(id)) document.getElementById(id).value = ""; });
  const btn = document.getElementById("btnPublish");
  if (btn) btn.textContent = "Publicar";
}
