import { supabase } from "./supabase.js";

export async function subirImagenProducto(file) {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Debes iniciar sesión.");

  const ext = file.name.split(".").pop();
  const fileName = `${user.id}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from("productos-imagenes")
    .upload(fileName, file);

  if (error) throw error;

  const { data } = supabase.storage
    .from("productos-imagenes")
    .getPublicUrl(fileName);

  return data.publicUrl;
}

export async function publicarProducto(producto) {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Debes iniciar sesión para publicar.");

  const { error } = await supabase.from("productos").insert([{
    nombre: producto.nombre,
    precio: Number(producto.precio),
    descripcion: producto.descripcion,
    categoria: producto.categoria,
    imagen: producto.imagen,
    estado: producto.estado,
    ubicacion: producto.ubicacion,
    telefono: producto.telefono,
    user_id: user.id
  }]);

  if (error) throw error;
}


export async function obtenerProductos() {
  const { data, error } = await supabase
    .from("productos")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
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
    console.error(error);
    return [];
  }

  return data;
}

export async function actualizarProducto(id, producto) {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Debes iniciar sesión.");

  const { error } = await supabase
    .from("productos")
    .update({
      nombre: producto.nombre,
      precio: Number(producto.precio),
      descripcion: producto.descripcion,
      categoria: producto.categoria,
      imagen: producto.imagen,
      estado: producto.estado,
      ubicacion: producto.ubicacion,
      telefono: producto.telefono
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw error;
}

export async function eliminarProducto(id) {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Debes iniciar sesión.");

  const { error } = await supabase
    .from("productos")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw error; 
}
