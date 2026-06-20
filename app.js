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
    authArea: $("authArea"),
    userMenu: $("userMenu"),
    userName: $("userNameDisplay"),
    buyGrid: $("buyGrid"),
    recentGrid: $("recentGrid"),
    myGrid: $("myListingsGrid"),
    navLinks: document.querySelectorAll("[data-section]")
  };

  // TABS LOGIN / REGISTRO
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn")
        .forEach(b => b.classList.remove("active"));

      document.querySelectorAll(".tab-panel")
        .forEach(p => p.classList.remove("active"));

      btn.classList.add("active");

      const tab = btn.dataset.tab;
      document.getElementById(`tab-${tab}`)?.classList.add("active");
    });
  });

  function render() {
    ui.loginModal?.classList.toggle("hidden", !state.modal.login);
    ui.sellModal?.classList.toggle("hidden", !state.modal.sell);

    if (state.user) {
      ui.authArea?.classList.add("hidden");
      ui.userMenu?.classList.remove("hidden");

      if (ui.userName) {
        ui.userName.textContent = state.user.email.split("@")[0];
      }
    } else {
      ui.authArea?.classList.remove("hidden");
      ui.userMenu?.classList.add("hidden");
    }

    document.querySelectorAll(".section").forEach(s => {
      s.classList.add("hidden");
      s.classList.remove("active");
    });

    const active = document.getElementById(`section-${state.section}`);

    if (active) {
      active.classList.remove("hidden");
      active.classList.add("active");
    }
  }

  function openLogin() {
    state.modal.login = true;
    state.modal.sell = false;
    render();
  }

  function openSell() {
    if (!state.user) {
      openLogin();
      return;
    }

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

  $("btnLogout")?.addEventListener("click", async () => {
    await logout();
    state.user = null;
    state.myProducts = [];
    $("dropdownMenu")?.classList.remove("open");
    render();
  });

  $("btnEmailLogin")?.addEventListener("click", async () => {
    try {
      await login($("loginEmail").value, $("loginPassword").value);
      closeModals();
      await loadProducts();
    } catch (e) {
      alert(e.message);
    }
  });

  $("btnRegister")?.addEventListener("click", async () => {
    try {
      await registrar($("regEmail").value, $("regPassword").value);
      alert("Revisa tu correo para confirmar tu cuenta");
    } catch (e) {
      alert(e.message);
    }
  });

  $("btnOpenSell")?.addEventListener("click", () => {
    openSell();
  });

  $("userAvatarBtn")?.addEventListener("click", (e) => {
    e.stopPropagation();
    $("dropdownMenu")?.classList.toggle("open");
  });

  document.addEventListener("click", (e) => {
    const menu = $("dropdownMenu");
    const btn = $("userAvatarBtn");

    if (
      menu &&
      btn &&
      !menu.contains(e.target) &&
      !btn.contains(e.target)
    ) {
      menu.classList.remove("open");
    }
  });

  // PUBLICAR / EDITAR PRODUCTO
  $("btnPublish")?.addEventListener("click", async () => {
    try {
      if (!state.user) {
        alert("Debes iniciar sesión");
        openLogin();
        return;
      }

      let imagenFinal = $("prodImage").value;

      const file = $("prodImageFile")?.files?.[0];

      if (file) {
        imagenFinal = await subirImagenProducto(file);
      }

      const producto = {
        nombre: $("prodName").value,
        precio: $("prodPrice").value,
        categoria: $("prodCategory").value,
        estado: $("prodCondition").value,
        descripcion: $("prodDescription").value,
        ubicacion: $("prodLocation").value,
        imagen: imagenFinal,
        telefono: $("prodPhone").value
      };

      if (state.editId) {
        await actualizarProducto(state.editId, producto);
        alert("Producto actualizado");
        state.editId = null;
        $("btnPublish").textContent = "Publicar";
      } else {
        await publicarProducto(producto);
        alert("Producto publicado correctamente");
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

  // MODAL PRODUCTO
  const productModal = $("productModal");
  const modalImg = $("modalImg");
  const modalTitle = $("modalTitle");
  const modalPrice = $("modalPrice");
  const modalDesc = $("modalDesc");
  const modalCat = $("modalCat");
  const modalState = $("modalState");
  const modalUb = $("modalUb");
  const btnContact = $("contactSellerBtn");

  let selectedProduct = null;

  function openProductModal(p) {
    selectedProduct = p;

    if (modalImg) modalImg.src = p.imagen || "https://via.placeholder.com/400";
    if (modalTitle) modalTitle.textContent = p.nombre || "";
    if (modalPrice) modalPrice.textContent = `Bs ${p.precio || 0}`;
    if (modalDesc) modalDesc.textContent = p.descripcion || "Sin descripción";
    if (modalCat) modalCat.textContent = p.categoria || "-";
    if (modalState) modalState.textContent = p.estado || "-";
    if (modalUb) modalUb.textContent = p.ubicacion || "-";

    productModal?.classList.remove("hidden");
    productModal?.classList.add("show");
  }

  function closeProductModal() {
    productModal?.classList.remove("show");

    setTimeout(() => {
      productModal?.classList.add("hidden");
    }, 200);

    selectedProduct = null;
  }

  document.addEventListener("click", (e) => {
    const editBtn = e.target.closest("[data-edit]");
    const deleteBtn = e.target.closest("[data-delete]");

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

    const card = e.target.closest(".product-card");

    if (card && card.dataset.id) {
      const p = state.products.find(
        x => String(x.id) === String(card.dataset.id)
      );

      if (p) openProductModal(p);
      return;
    }

    if (e.target.id === "productModal") {
      closeProductModal();
    }
  });

  $("closeProductModal")?.addEventListener("click", closeProductModal);

  btnContact?.addEventListener("click", () => {
    if (!selectedProduct) return;

    const tel = selectedProduct.telefono;

    if (!tel) {
      alert("El vendedor no dejó número de contacto");
      return;
    }

    const cleanTel = tel.replace(/\D/g, "");

    const msg = encodeURIComponent(
      `Hola, vi tu producto "${selectedProduct.nombre}" en FICCT Market y estoy interesado.`
    );

    window.open(`https://wa.me/${cleanTel}?text=${msg}`, "_blank");
  });

  async function loadProducts() {
    try {
      const data = await obtenerProductos();
      state.products = data || [];

      if (ui.buyGrid) {
        ui.buyGrid.innerHTML = state.products.length
          ? state.products.map(renderCard).join("")
          : `<p>No hay productos disponibles.</p>`;
      }

      if (ui.recentGrid) {
        ui.recentGrid.innerHTML = state.products.length
          ? state.products.slice(0, 6).map(renderCard).join("")
          : `<p>No hay productos disponibles.</p>`;
      }

    } catch (err) {
      console.error(err);

      if (ui.buyGrid) {
        ui.buyGrid.innerHTML = `<p>Error cargando productos</p>`;
      }

      if (ui.recentGrid) {
        ui.recentGrid.innerHTML = `<p>Error cargando productos</p>`;
      }
    }
  }

  async function loadMyProducts() {
    try {
      if (!state.user) {
        if (ui.myGrid) ui.myGrid.innerHTML = "";
        return;
      }

      const data = await obtenerMisProductos();
      state.myProducts = data || [];

      if (ui.myGrid) {
        ui.myGrid.innerHTML = state.myProducts.length
          ? state.myProducts.map(renderCard).join("")
          : `<p>No tienes productos publicados.</p>`;
      }

    } catch (err) {
      console.error(err);

      if (ui.myGrid) {
        ui.myGrid.innerHTML = `<p>Error cargando tus productos</p>`;
      }
    }
  }

  function limpiarFormulario() {
    $("prodName").value = "";
    $("prodPrice").value = "";
    $("prodDescription").value = "";
    $("prodLocation").value = "Santa Cruz, Bolivia";
    $("prodImage").value = "";
    $("prodPhone").value = "";

    if ($("prodImageFile")) {
      $("prodImageFile").value = "";
    }

    state.editId = null;

    if ($("btnPublish")) {
      $("btnPublish").textContent = "Publicar";
    }
  }

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

  async function borrarProducto(id) {
    const ok = confirm("¿Eliminar este producto?");

    if (!ok) return;

    try {
      await eliminarProducto(id);

      alert("Producto eliminado");

      await loadProducts();
      await loadMyProducts();

    } catch (e) {
      alert("Error al eliminar: " + e.message);
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
                <button class="btn-edit" data-edit="${p.id}">Editar</button>
                <button class="btn-delete" data-delete="${p.id}">Eliminar</button>
              </div>
              `
              : ""
          }
        </div>
      </div>
    `;
  }

  // CATEGORÍAS
  document.querySelectorAll(".cat-tab").forEach(btn => {
    btn.addEventListener("click", async () => {
      document.querySelectorAll(".cat-tab")
        .forEach(b => b.classList.remove("active"));

      btn.classList.add("active");

      await loadProducts();

      const categoria = btn.dataset.category;

      const filtrados =
        categoria === "Todos"
          ? state.products
          : state.products.filter(p => p.categoria === categoria);

      if (ui.buyGrid) {
        ui.buyGrid.innerHTML = filtrados.length
          ? filtrados.map(renderCard).join("")
          : `<p>No hay productos en esta categoría.</p>`;
      }

      state.section = "comprar";
      render();
    });
  });
function filtrarBusqueda() {
  const texto = $("searchInput")?.value.toLowerCase().trim() || "";

  const resultados = state.products.filter(p =>
    (p.nombre || "").toLowerCase().includes(texto) ||
    (p.descripcion || "").toLowerCase().includes(texto) ||
    (p.categoria || "").toLowerCase().includes(texto) ||
    (p.ubicacion || "").toLowerCase().includes(texto)
  );

  state.section = "comprar";

  if (ui.buyGrid) {
    ui.buyGrid.innerHTML = resultados.length
      ? resultados.map(renderCard).join("")
      : `<p>No se encontraron productos.</p>`;
  }

  render();
}

$("searchBtn")?.addEventListener("click", async () => {
  await loadProducts();
  filtrarBusqueda();
});

$("searchInput")?.addEventListener("keyup", async (e) => {
  if (e.key === "Enter") {
    await loadProducts();
    filtrarBusqueda();
  }
});
$("searchInput")?.addEventListener("input", () => {
  filtrarBusqueda();
});
  // INIT
  loadProducts();
  setSection("home");
  render();
});

// SIDEBAR
const sidebar = document.querySelector(".sidebar");
const overlay = document.querySelector(".sidebar-overlay");
const hamburger = document.querySelector(".hamburger");

let closeTimeout;

function openSidebar() {
  sidebar?.classList.add("open");
  overlay?.classList.add("visible");
}

function closeSidebar() {
  sidebar?.classList.remove("open");
  overlay?.classList.remove("visible");
}

hamburger?.addEventListener("mouseenter", () => {
  clearTimeout(closeTimeout);
  openSidebar();
});

sidebar?.addEventListener("mouseenter", () => {
  clearTimeout(closeTimeout);
  openSidebar();
});

sidebar?.addEventListener("mouseleave", () => {
  closeTimeout = setTimeout(closeSidebar, 200);
});

hamburger?.addEventListener("mouseleave", () => {
  closeTimeout = setTimeout(() => {
    if (!sidebar?.matches(":hover")) closeSidebar();
  }, 200);
});

overlay?.addEventListener("click", closeSidebar);
