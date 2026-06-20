import { supabase } from "./supabase.js";

export async function publicarProducto(producto) {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Debes iniciar sesión para publicar.");
  }

  const { error } = await supabase
    .from("productos")
    .insert([
      {
        nombre: producto.nombre,
        precio: Number(producto.precio),
        descripcion: producto.descripcion,
        categoria: producto.categoria,
        imagen: producto.imagen,
        estado: producto.estado,
        ubicacion: producto.ubicacion,
        telefono: producto.telefono,   // 👈 AQUÍ
        user_id: user.id
      }
    ]);

  if (error) throw error;
}

export async function obtenerProductos() {
  const { data, error } = await supabase
    .from("productos")
    .select("*")
    .order("created_at", { ascending: false });

  console.log("PRODUCTOS:", data);

  if (error) {
    console.error("ERROR obtenerProductos:", error);
    return [];
  }

  return data;
}

export async function obtenerMisProductos() {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("productos")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("ERROR obtenerMisProductos:", error);
    return [];
  }

  return data;
}
