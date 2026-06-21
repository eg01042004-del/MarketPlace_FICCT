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
    deleteModal: $("deleteModal"), // Vinculado al HTML
    authArea: $("authArea"),
    userMenu: $("userMenu"),   
    userName: $("userNameDisplay"),
    buyGrid: $("buyGrid"),
    recentGrid: $("recentGrid"),
    myGrid: $("myListingsGrid"),
    searchInput: $("searchInput"),
    searchBtn: $("searchBtn"),
    navLinks: document.querySelectorAll("[data-section]:not(.cat-tab)")
  };

  // --- 1. CORRECCIÓN BUSCADOR (Anti-Autofill y Limpieza) ---
  if (ui.searchInput) {
    ui.searchInput.value = ""; 
    ui.searchInput.setAttribute("autocomplete", "one-time-code");
    ui.searchInput.setAttribute("name", "search_" + Math.random()); // Evita que Chrome asocie el campo al email
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

  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));

      btn.classList.add("active");
      document.getElementById(`tab-${btn.dataset.tab}`)?.classList.add("active");
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
      if (!email || !password) return alert("Coloca correo y contraseña.");
      await login(email, password);
      closeModals();
      await loadProducts();
    } catch (e) { alert("Error al ingresar: " + e.message); }
  });

  $("btnRegister")?.addEventListener("click", async () => {
    try {
      const email = $("regEmail").value.trim();
      const password = $("regPassword").value.trim();
      if (!email || !password) return alert("Coloca correo y contraseña.");
      if (password.length < 6) return alert("Mínimo 6 caracteres.");
      await registrar(email, password);
      alert("Cuenta creada. Ahora inicia sesión.");
    } catch (e) { alert("Error al registrar: " + e.message); }
  });

  $("userAvatarBtn")?.addEventListener("click", (e) => {
    e.stopPropagation();
    $("dropdownMenu")?.classList.toggle("open");
  });

  document.addEventListener("click", (e) => {
    const menu = $("dropdownMenu");
    const btn = $("userAvatarBtn");
    if (menu && btn && !menu.contains(e.target) && !btn.contains(e.target)) {
      menu.classList.remove("open");
    }
  });

  // --- 4 & 5. CORRECCIÓN CÁMARA Y PUBLICACIÓN ---
  $("btnPublish")?.addEventListener("click", async (e) => {
    e.preventDefault(); // Evita recargas o cierres accidentales
    try {
      if (!state.user) return openLogin();

      const publishBtn = $("btnPublish");
      publishBtn.disabled = true;
      publishBtn.textContent = "Procesando...";

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
        publishBtn.disabled = false;
        publishBtn.textContent = state.editId ? "Guardar cambios" : "Publicar";
        return alert("Coloca nombre y precio.");
      }

      if (state.editId) {
        await actualizarProducto(state.editId, producto);
        alert("Producto actualizado");
      } else {
        await publicarProducto(producto);
        alert("Producto publicado");
      }

      limpiarFormulario();
      closeModals();
      await loadProducts();
      await loadMyProducts();
      state.section = "vender";
      render();

    } catch (e) {
      console.error(e);
      alert("Error: " + e.message);
    } finally {
      $("btnPublish").disabled = false;
    }
  });

  observarAuth(async (user) => {
    state.user = user;
    const msg = $("notLoggedSell");
    if (user) {
      msg?.classList.add("hidden");
      await loadMyProducts();
    } else {
      msg?.classList.remove("hidden");
      state.myProducts = [];
    }
    render();
  });

  // --- 2, 3 & 4. CORRECCIÓN EDITAR, ELIMINAR Y TARJETAS ---
  document.addEventListener("click", (e) => {
    const editBtn = e.target.closest("[data-edit]");
    const deleteBtn = e.target.closest("[data-delete]");
    const card = e.target.closest(".product-card");

    if (editBtn) {
      e.preventDefault();
      e.stopPropagation(); // IMPORTANTE: No abre la tarjeta
      editarProducto(editBtn.dataset.edit);
      return;
    }

    if (deleteBtn) {
      e.preventDefault();
      e.stopPropagation(); // IMPORTANTE: No abre la tarjeta
      borrarProducto(deleteBtn.dataset.delete);
      return;
    }

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

  // --- 3. CORRECCIÓN ELIMINAR (deleteModal sin alert nativo) ---
  function borrarProducto(id) {
    const dModal = ui.deleteModal;
    const cancelBtn = $("cancelDelete");
    const confirmBtn = $("confirmDelete");

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
        alert("Error al eliminar");
      } finally {
        confirmBtn.disabled = false;
        confirmBtn.textContent = "Eliminar";
      }
    };
  }

  // --- BUSCADOR (Lógica de filtrado) ---
  function filtrarBusqueda() {
    const texto = ui.searchInput?.value.toLowerCase().trim() || "";
    if (texto === "") return loadProducts();

    const resultados = state.products.filter(p =>
      (p.nombre || "").toLowerCase().includes(texto) ||
      (p.categoria || "").toLowerCase().includes(texto)
    );

    state.section = "comprar";
    if (ui.buyGrid) {
      ui.buyGrid.innerHTML = resultados.length
        ? resultados.map(renderCard).join("")
        : `<p class="no-products">No se encontraron productos.</p>`;
    }
    render();
  }

  ui.searchBtn?.addEventListener("click", filtrarBusqueda);
  ui.searchInput?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") filtrarBusqueda();
  });

  // --- PRODUCT MODAL LÓGICA ---
  const productModal = $("productModal");
  function openProductModal(p) {
    state.selectedProduct = p;
    $("modalImg").src = p.imagen || "https://via.placeholder.com/400";
    $("modalTitle").textContent = p.nombre || "";
    $("modalPrice").textContent = `Bs ${p.precio || 0}`;
    $("modalDesc").textContent = p.descripcion || "Sin descripción";
    $("modalCat").textContent = p.categoria || "-";
    $("modalState").textContent = p.estado || "-";
    $("modalUb").textContent = p.ubicacion || "-";
    productModal?.classList.remove("hidden");
    productModal?.classList.add("show");
  }

  function closeProductModal() {
    productModal?.classList.remove("show");
    setTimeout(() => productModal?.classList.add("hidden"), 200);
  }
  $("closeProductModal")?.addEventListener("click", closeProductModal);

  $("contactSellerBtn")?.addEventListener("click", () => {
    if (!state.selectedProduct?.telefono) return alert("Sin teléfono");
    const tel = state.selectedProduct.telefono.replace(/\D/g, "");
    window.open(`https://wa.me/${tel}?text=Hola, me interesa tu producto: ${state.selectedProduct.nombre}`, "_blank");
  });

  async function loadProducts() {
    try {
      const data = await obtenerProductos();
      state.products = data || [];
      if (ui.buyGrid) ui.buyGrid.innerHTML = state.products.map(renderCard).join("");
      if (ui.recentGrid) ui.recentGrid.innerHTML = state.products.slice(0, 6).map(renderCard).join("");
    } catch (err) { console.error(err); }
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
          <div class="product-category">${p.categoria || "General"}</div>
          <div class="product-title">${p.nombre || "Sin nombre"}</div>
          <div class="product-price">Bs ${p.precio || 0}</div>
          <div class="product-meta"><span>📍 ${p.ubicacion || "Bolivia"}</span></div>
          ${isMine ? `
              <div class="product-actions">
                <button type="button" class="btn-edit" data-edit="${p.id}">Editar</button>
                <button type="button" class="btn-delete" data-delete="${p.id}">Eliminar</button>
              </div>` : ""
          }
        </div>
      </div>`;
  }

  function limpiarFormulario() {
    $("prodName").value = ""; $("prodPrice").value = ""; $("prodDescription").value = "";
    $("prodLocation").value = "Santa Cruz, Bolivia"; $("prodImage").value = ""; $("prodPhone").value = "";
    if ($("prodImageFile")) $("prodImageFile").value = "";
    state.editId = null;
    $("btnPublish").textContent = "Publicar";
  }

  // --- SIDEBAR ---
  const sidebar = $("sidebar");
  const overlay = $("sidebarOverlay");
  $("hamburgerBtn")?.addEventListener("click", (e) => {
    e.stopPropagation();
    sidebar?.classList.toggle("open");
    overlay?.classList.toggle("hidden");
    overlay?.classList.toggle("visible");
  });
  overlay?.addEventListener("click", () => {
    sidebar?.classList.remove("open");
    overlay?.classList.add("hidden");
    overlay?.classList.remove("visible");
  });

  loadProducts();
  setSection("home");
});
