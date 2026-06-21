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
    deleteModal: $("deleteModal"), // Modal de confirmación
    authArea: $("authArea"),
    userMenu: $("userMenu"),   
    userName: $("userNameDisplay"),
    buyGrid: $("buyGrid"),
    recentGrid: $("recentGrid"),
    myGrid: $("myListingsGrid"),
    searchInput: $("searchInput"),
    navLinks: document.querySelectorAll("[data-section]:not(.cat-tab)")
  };

  // 1. CORRECCIÓN BUSCADOR: Iniciar vacío y sin interferencias
  if (ui.searchInput) {
    ui.searchInput.value = "";
    ui.searchInput.autocomplete = "off";
    ui.searchInput.readOnly = true; // Evita autofill inicial
    setTimeout(() => ui.searchInput.readOnly = false, 500);
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

  // 4 y 5. CÁMARA E IMÁGENES: Mantener datos y procesar correctamente
  $("btnPublish")?.addEventListener("click", async (e) => {
    e.preventDefault();
    try {
      if (!state.user) return openLogin();

      const btn = $("btnPublish");
      const originalText = btn.textContent;
      btn.textContent = "Procesando...";
      btn.disabled = true;

      let imagenFinal = $("prodImage").value.trim();
      const file = $("prodImageFile")?.files?.[0];

      // Si hay archivo nuevo, subirlo, sino mantener URL actual
      if (file) {
        imagenFinal = await subirImagenProducto(file);
      }

      const producto = {
        nombre: $("prodName").value.trim(),
        precio: Number($("prodPrice").value),
        categoria: $("prodCategory").value,
        estado: $("prodCondition").value,
        descripcion: $("prodDescription").value.trim(),
        ubicacion: $("prodLocation").value.trim(),
        imagen: imagenFinal,
        telefono: $("prodPhone").value.trim()
      };

      if (!producto.nombre || !producto.precio) {
        throw new Error("Nombre y precio requeridos");
      }

      if (state.editId) {
        await actualizarProducto(state.editId, producto);
      } else {
        await publicarProducto(producto);
      }

      limpiarFormulario();
      closeModals();
      await loadProducts();
      await loadMyProducts();
    } catch (e) {
      alert("Error: " + e.message);
    } finally {
      $("btnPublish").disabled = false;
      $("btnPublish").textContent = state.editId ? "Guardar cambios" : "Publicar";
    }
  });

  observarAuth(async (user) => {
    state.user = user;
    if (user) {
      $("notLoggedSell")?.classList.add("hidden");
      await loadMyProducts();
    } else {
      $("notLoggedSell")?.classList.remove("hidden");
      state.myProducts = [];
    }
    render();
  });

  // 2, 3 y 4. EVENTOS DE TARJETAS (EDITAR/ELIMINAR)
  document.addEventListener("click", (e) => {
    const editBtn = e.target.closest("[data-edit]");
    const deleteBtn = e.target.closest("[data-delete]");
    const card = e.target.closest(".product-card");

    if (editBtn) {
      e.stopPropagation();
      editarProducto(editBtn.dataset.edit);
      return;
    }

    if (deleteBtn) {
      e.stopPropagation();
      borrarProducto(deleteBtn.dataset.delete);
      return;
    }

    if (card && card.dataset.id) {
      const p = state.products.find(x => String(x.id) === String(card.dataset.id)) || 
                state.myProducts.find(x => String(x.id) === String(card.dataset.id));
      if (p) openProductModal(p);
    }
  });

  function editarProducto(id) {
    const p = state.myProducts.find(x => String(x.id) === String(id));
    if (!p) return;

    state.editId = p.id;
    $("prodName").value = p.nombre || "";
    $("prodPrice").value = p.precio || "";
    $("prodCategory").value = p.categoria || "Libros";
    $("prodCondition").value = p.estado || "Usado";
    $("prodDescription").value = p.descripcion || "";
    $("prodLocation").value = p.ubicacion || "";
    $("prodImage").value = p.imagen || "";
    $("prodPhone").value = p.telefono || "";

    $("btnPublish").textContent = "Guardar cambios";
    openSell();
  }

  // 3. ELIMINAR: Sin alert, usando deleteModal
  function borrarProducto(id) {
    const dModal = $("deleteModal");
    dModal.classList.remove("hidden");

    $("confirmDelete").onclick = async () => {
      try {
        $("confirmDelete").disabled = true;
        $("confirmDelete").textContent = "Eliminando...";
        await eliminarProducto(id);
        dModal.classList.add("hidden");
        await loadProducts();
        await loadMyProducts();
      } catch (e) {
        console.error(e);
      } finally {
        $("confirmDelete").disabled = false;
        $("confirmDelete").textContent = "Eliminar";
      }
    };

    $("cancelDelete").onclick = () => dModal.classList.add("hidden");
  }

  // BUSCADOR: Solo ejecuta cuando se solicita
  function filtrarBusqueda() {
    const texto = $("searchInput").value.toLowerCase().trim();
    if (!texto) {
        loadProducts();
        return;
    }
    const res = state.products.filter(p => 
      p.nombre.toLowerCase().includes(texto) || 
      p.categoria.toLowerCase().includes(texto)
    );
    if (ui.buyGrid) ui.buyGrid.innerHTML = res.map(renderCard).join("");
    state.section = "comprar";
    render();
  }

  $("searchBtn")?.addEventListener("click", filtrarBusqueda);
  ui.searchInput?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") filtrarBusqueda();
  });

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

  function renderCard(p) {
    const isMine = state.user && p.user_id === state.user.id;
    return `
      <div class="product-card" data-id="${p.id}">
        <img class="product-img" src="${p.imagen || 'https://via.placeholder.com/300'}" onerror="this.src='https://via.placeholder.com/300'">
        <div class="product-info">
          <div class="product-category">${p.categoria}</div>
          <div class="product-title">${p.nombre}</div>
          <div class="product-price">Bs ${p.precio}</div>
          <div class="product-meta"><span>📍 ${p.ubicacion}</span></div>
          ${isMine ? `
            <div class="product-actions">
              <button class="btn-edit" data-edit="${p.id}">Editar</button>
              <button class="btn-delete" data-delete="${p.id}">Eliminar</button>
            </div>` : ""}
        </div>
      </div>`;
  }

  function limpiarFormulario() {
    state.editId = null;
    $("prodName").value = "";
    $("prodPrice").value = "";
    $("prodDescription").value = "";
    $("prodImage").value = "";
    $("prodImageFile").value = "";
    $("prodPhone").value = "";
    $("btnPublish").textContent = "Publicar";
  }

  loadProducts();
  setSection("home");
});
