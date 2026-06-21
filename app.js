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
    editId: null,
    selectedProduct: null
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
    searchBtn: $("searchBtn"),
    navLinks: document.querySelectorAll(
  ".brand[data-section], .sidebar-item[data-section], .nav-link:not(.cat-tab)[data-section], .sell-hero [data-section]"
)
  };

  if (ui.searchInput) {
    ui.searchInput.value = "";
    ui.searchInput.removeAttribute("name");
    ui.searchInput.setAttribute("autocomplete", "off");
    ui.searchInput.setAttribute("autocorrect", "off");
    ui.searchInput.setAttribute("autocapitalize", "off");
    ui.searchInput.setAttribute("spellcheck", "false");
    ui.searchInput.blur();
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

      if (!email || !password) {
        alert("Coloca correo y contraseña.");
        return;
      }

      await login(email, password);
      closeModals();
      await loadProducts();
    } catch (e) {
      alert("Error al ingresar: " + e.message);
    }
  });

  $("btnRegister")?.addEventListener("click", async () => {
    try {
      const email = $("regEmail").value.trim();
      const password = $("regPassword").value.trim();

      if (!email || !password) {
        alert("Coloca correo y contraseña.");
        return;
      }

      if (password.length < 6) {
        alert("La contraseña debe tener mínimo 6 caracteres.");
        return;
      }

      await registrar(email, password);
      alert("Cuenta creada. Ahora inicia sesión.");
    } catch (e) {
      alert("Error al registrar: " + e.message);
    }
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

  $("btnPublish")?.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const publishBtn = $("btnPublish");

    try {
      if (!state.user) return openLogin();

      publishBtn.disabled = true;
      publishBtn.textContent = "Procesando...";

      let imagenFinal = $("prodImage").value.trim();

      const fileInput = $("prodImageFile");
      const file =
        fileInput && fileInput.files && fileInput.files.length
          ? fileInput.files[0]
          : null;

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
        alert("Coloca nombre y precio.");
        return;
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

      state.section = "vender";
      render();

    } catch (e) {
      console.error(e);
      alert("Error: " + e.message);
    } finally {
      publishBtn.disabled = false;
      publishBtn.textContent = state.editId ? "Guardar cambios" : "Publicar";
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

  document.addEventListener("click", (e) => {
    const editBtn = e.target.closest("[data-edit]");
    const deleteBtn = e.target.closest("[data-delete]");
    const card = e.target.closest(".product-card");

    if (editBtn) {
      e.preventDefault();
      e.stopPropagation();
      editarProducto(editBtn.dataset.edit);
      return;
    }

    if (deleteBtn) {
      e.preventDefault();
      e.stopPropagation();
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

    if (e.target.id === "productModal") {
      closeProductModal();
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

    const fileInput = $("prodImageFile");
    if (fileInput) fileInput.value = "";

    $("btnPublish").textContent = "Guardar cambios";

    openSell();
  }

  function borrarProducto(id) {
    const modal = ui.deleteModal;
    const cancelBtn = $("cancelDelete");
    const confirmBtn = $("confirmDelete");

    if (!modal || !cancelBtn || !confirmBtn) {
      alert("No se encontró el modal de eliminar.");
      return;
    }

    modal.classList.remove("hidden");

    cancelBtn.onclick = () => {
      modal.classList.add("hidden");
    };

    confirmBtn.onclick = async () => {
      try {
        confirmBtn.disabled = true;
        confirmBtn.textContent = "Eliminando...";

        await eliminarProducto(id);

        modal.classList.add("hidden");

        await loadProducts();
        await loadMyProducts();
      } catch (e) {
        alert("Error al eliminar: " + e.message);
      } finally {
        confirmBtn.disabled = false;
        confirmBtn.textContent = "Eliminar";
      }
    };
  }

  function openProductModal(p) {
    state.selectedProduct = p;

    $("modalImg").src = p.imagen || "https://via.placeholder.com/400";
    $("modalTitle").textContent = p.nombre || "";
    $("modalPrice").textContent = `Bs ${p.precio || 0}`;
    $("modalDesc").textContent = p.descripcion || "Sin descripción";
    $("modalCat").textContent = p.categoria || "-";
    $("modalState").textContent = p.estado || "-";
    $("modalUb").textContent = p.ubicacion || "-";

    $("productModal")?.classList.remove("hidden");
    $("productModal")?.classList.add("show");
  }

  function closeProductModal() {
    $("productModal")?.classList.remove("show");
    setTimeout(() => $("productModal")?.classList.add("hidden"), 200);
  }

  $("closeProductModal")?.addEventListener("click", closeProductModal);

  $("contactSellerBtn")?.addEventListener("click", () => {
    if (!state.selectedProduct?.telefono) {
      alert("Sin teléfono de contacto.");
      return;
    }

    const tel = state.selectedProduct.telefono.replace(/\D/g, "");
    const msg = encodeURIComponent(
      `Hola, vi tu producto "${state.selectedProduct.nombre}" en FICCT Market y estoy interesado.`
    );

    window.open(`https://wa.me/${tel}?text=${msg}`, "_blank");
  });

  function filtrarBusqueda() {
    const texto = ui.searchInput?.value.toLowerCase().trim() || "";

    if (!texto) {
      loadProducts();
      return;
    }

    const resultados = state.products.filter(p =>
      (p.nombre || "").toLowerCase().includes(texto) ||
      (p.categoria || "").toLowerCase().includes(texto) ||
      (p.descripcion || "").toLowerCase().includes(texto) ||
      (p.ubicacion || "").toLowerCase().includes(texto)
    );

    state.section = "comprar";

    if (ui.buyGrid) {
      ui.buyGrid.innerHTML = resultados.length
        ? resultados.map(renderCard).join("")
        : `<p class="no-products">No se encontraron productos.</p>`;
    }

    render();
  }

  ui.searchBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    filtrarBusqueda();
  });

  ui.searchInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      filtrarBusqueda();
    }
  });

  async function loadProducts() {
    try {
      const data = await obtenerProductos();
      state.products = data || [];

      if (ui.buyGrid) {
        ui.buyGrid.innerHTML = state.products.length
          ? state.products.map(renderCard).join("")
          : `<p class="no-products">No hay productos disponibles.</p>`;
      }

      if (ui.recentGrid) {
        ui.recentGrid.innerHTML = state.products.length
          ? state.products.slice(0, 6).map(renderCard).join("")
          : `<p class="no-products">No hay productos disponibles.</p>`;
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function loadMyProducts() {
    if (!state.user) {
      if (ui.myGrid) ui.myGrid.innerHTML = "";
      return;
    }

    try {
      const data = await obtenerMisProductos();
      state.myProducts = data || [];

      if (ui.myGrid) {
        ui.myGrid.innerHTML = state.myProducts.length
          ? state.myProducts.map(renderCard).join("")
          : `<p class="no-products">No tienes productos publicados.</p>`;
      }
    } catch (err) {
      console.error(err);
    }
  }

  function renderCard(p) {
    const isMine = state.user && p.user_id === state.user.id;

    return `
      <div class="product-card" data-id="${p.id}">
        <img
          class="product-img"
          src="${p.imagen || 'https://via.placeholder.com/300'}"
          onerror="this.src='https://via.placeholder.com/300'"
        >

        <div class="product-info">
          <div class="product-category">${p.categoria || "General"}</div>
          <div class="product-title">${p.nombre || "Sin nombre"}</div>
          <div class="product-price">Bs ${p.precio || 0}</div>

          <div class="product-meta">
            <span>📍 ${p.ubicacion || "Bolivia"}</span>
          </div>

          ${
            isMine
              ? `
              <div class="product-actions">
                <button type="button" class="btn-edit" data-edit="${p.id}">
                  Editar
                </button>

                <button type="button" class="btn-delete" data-delete="${p.id}">
                  Eliminar
                </button>
              </div>
              `
              : ""
          }
        </div>
      </div>
    `;
  }

  function limpiarFormulario() {
    state.editId = null;

    $("prodName").value = "";
    $("prodPrice").value = "";
    $("prodDescription").value = "";
    $("prodLocation").value = "Santa Cruz, Bolivia";
    $("prodImage").value = "";
    $("prodPhone").value = "";

    const fileInput = $("prodImageFile");
    if (fileInput) fileInput.value = "";

    $("btnPublish").textContent = "Publicar";
  }

  const sidebar = $("sidebar");
  const overlay = $("sidebarOverlay");

  $("hamburgerBtn")?.addEventListener("click", (e) => {
    e.preventDefault();
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
  document.querySelectorAll(".cat-tab").forEach(btn => {
  btn.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();

    document.querySelectorAll(".cat-tab").forEach(b => {
      b.classList.remove("active");
    });

    btn.classList.add("active");

    await loadProducts();

    const categoria = btn.dataset.category;

    const filtrados =
      categoria === "Todos"
        ? state.products
        : state.products.filter(p => p.categoria === categoria);

    state.section = "comprar";

    if (ui.buyGrid) {
      ui.buyGrid.innerHTML = filtrados.length
        ? filtrados.map(renderCard).join("")
        : `<p class="no-products">No hay productos en esta categoría.</p>`;
    }

    render();
  });
});
  loadProducts();
  setSection("home");
});
