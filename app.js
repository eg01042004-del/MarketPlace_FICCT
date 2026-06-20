import { supabase } from "./supabase.js";
import { registrar, login, logout, observarAuth } from "./auth.js";
import { publicarProducto, obtenerProductos, obtenerMisProductos } from "./productos.js";

document.addEventListener("DOMContentLoaded", () => {

    const state = {
        user: null,
        modal: { login: false, sell: false },
        section: "home",
        products: [],
        myProducts: []
    };

    const $ = (id) => document.getElementById(id);

    const ui = {
        loginModal: $("loginModal"),
        sellModal: $("sellModal"),

        authArea: $("authArea"),
        userMenu: $("userMenu"),
        userName: $("userNameDisplay"),

        buyGrid: $("buyGrid"),
        myGrid: $("myListingsGrid"),

        navLinks: document.querySelectorAll("[data-section]")
    };

    // ================= UI =================
    function render() {

        ui.loginModal.classList.toggle("hidden", !state.modal.login);
        ui.sellModal.classList.toggle("hidden", !state.modal.sell);

        if (state.user) {
            ui.authArea.classList.add("hidden");
            ui.userMenu.classList.remove("hidden");
            ui.userName.textContent = state.user.email.split("@")[0];
        } else {
            ui.authArea.classList.remove("hidden");
            ui.userMenu.classList.add("hidden");
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

    // ================= MODALS =================
    const openLogin = () => {
        state.modal.login = true;
        state.modal.sell = false;
        render();
    };

    const openSell = () => {
        if (!state.user) return openLogin();
        state.modal.sell = true;
        state.modal.login = false;
        render();
    };

    const closeModals = () => {
        state.modal.login = false;
        state.modal.sell = false;
        render();
    };

    // ================= NAV =================
    function setSection(sec) {
        state.section = sec;

        if (sec === "comprar") loadProducts();
        if (sec === "vender") loadMyProducts();

        render();
    }

    ui.navLinks.forEach(link => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            setSection(link.dataset.section);
        });
    });

    // ================= AUTH EVENTS =================
    $("btnPublish")?.addEventListener("click", async () => {
    try {
        await publicarProducto({
            nombre: $("prodName").value,
            precio: $("prodPrice").value,
            categoria: $("prodCategory").value,
            estado: $("prodCondition").value,
            descripcion: $("prodDescription").value,
            ubicacion: $("prodLocation").value,
            imagen: $("prodImage").value,
            telefono: $("prodPhone").value
        });

        alert("Producto publicado correctamente");

        closeModals();

await loadProducts();

state.section="comprar";

render();

    } catch (e) {
        console.error(e);
        alert("Error al publicar: " + e.message);
    }
});
    $("btnLogin").addEventListener("click", openLogin);
    $("modalClose").addEventListener("click", closeModals);
    $("sellModalClose").addEventListener("click", closeModals);
    $("btnLogout").addEventListener("click", logout);

    $("btnEmailLogin").addEventListener("click", async () => {
        try {
            await login($("loginEmail").value, $("loginPassword").value);
            closeModals();
        } catch (e) {
            alert(e.message);
        }
    });

    $("btnRegister").addEventListener("click", async () => {
        try {
            await registrar($("regEmail").value, $("regPassword").value);
            alert("Revisa tu correo");
        } catch (e) {
            alert(e.message);
        }
    });

    $("btnOpenSell").addEventListener("click", () => {
        if (!state.user) return openLogin();
        openSell();
    });

    $("userAvatarBtn")?.addEventListener("click", () => {
        $("dropdownMenu")?.classList.toggle("open");
    });

    // ================= AUTH SUPABASE =================
    observarAuth((user)=>{

state.user=user;

const msg=
$("notLoggedSell");

if(user){

msg?.classList.add("hidden");

}else{

msg?.classList.remove("hidden");

}

render();

});

    // ================= PRODUCT MODAL =================
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

        modalImg.src = p.imagen || "https://via.placeholder.com/400";
        modalTitle.textContent = p.nombre || "";
        modalPrice.textContent = `Bs ${p.precio || 0}`;
        modalDesc.textContent = p.descripcion || "Sin descripción";
        modalCat.textContent = p.categoria || "-";
        modalState.textContent = p.estado || "-";
        modalUb.textContent = p.ubicacion || "-";

        productModal.classList.remove("hidden");
        productModal.classList.add("show");
    }

    function closeProductModal() {
        productModal.classList.remove("show");
        setTimeout(() => productModal.classList.add("hidden"), 200);
        selectedProduct = null;
    }

    // CLICK GLOBAL (FIXED)
    document.addEventListener("click", (e) => {

        const card = e.target.closest(".product-card");

        if (card && card.dataset.id) {
            const p = state.products.find(x => String(x.id) === String(card.dataset.id));
            if (p) openProductModal(p);
            return;
        }

        if (e.target.id === "productModal") {
            closeProductModal();
        }
    });

    $("closeProductModal")?.addEventListener("click", closeProductModal);

    // ================= CONTACT SELLER =================
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

    // ================= LOAD PRODUCTS =================
    async function loadProducts() {
        try {
            const data = await obtenerProductos();
            state.products = data || [];

            ui.buyGrid.innerHTML = state.products.length
                ? state.products.map(renderCard).join("")
                : `<p>No hay productos disponibles.</p>`;

        } catch (err) {
            console.error(err);
            ui.buyGrid.innerHTML = `<p>Error cargando productos</p>`;
        }
    }

    async function loadMyProducts() {
        const data = await obtenerMisProductos();
        state.myProducts = data || [];

        ui.myGrid.innerHTML = state.myProducts.length
            ? state.myProducts.map(renderCard).join("")
            : `<p>No tienes productos publicados.</p>`;
    }

  function renderCard(p){

return `

<div class="product-card"
data-id="${p.id}">

<img
class="product-img"
src="${
p.imagen ||
'https://via.placeholder.com/300'
}"
onerror="
this.src=
'https://via.placeholder.com/300'
">

<div class="product-info">

<div class="product-category">
${p.categoria || "General"}
</div>

<div class="product-title">
${p.nombre}
</div>

<div class="product-price">
Bs ${p.precio}
</div>

<div class="product-meta">

<span>

📍
${p.ubicacion || "Bolivia"}

</span>

</div>

</div>

</div>

`;

}

    // ================= INIT =================
    setSection("home");
    render();
});

// ================= SIDEBAR =================
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