-- ==============================
-- SCHEMA: Punto de Venta
-- ==============================

-- Tabla de usuarios
CREATE TABLE public.users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'vendedor',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de productos
CREATE TABLE public.products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  cost NUMERIC(10,2) NOT NULL DEFAULT 0,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  stock INT NOT NULL DEFAULT 0,
  barcode VARCHAR(50) UNIQUE,  -- si deseas que no se repita el código
  is_composite BOOLEAN NOT NULL DEFAULT false, -- true si es una ancheta (producto compuesto)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla para manejar la composición de productos (por ejemplo, anchetas)
CREATE TABLE public.product_compositions (
  id SERIAL PRIMARY KEY,
  parent_product_id INT NOT NULL,
  child_product_id INT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,

  CONSTRAINT fk_parent_product
    FOREIGN KEY (parent_product_id)
    REFERENCES public.products (id)
    ON DELETE CASCADE,

  CONSTRAINT fk_child_product
    FOREIGN KEY (child_product_id)
    REFERENCES public.products (id)
    ON DELETE CASCADE
);

-- Tabla de ventas (encabezado)
CREATE TABLE public.sales (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  sale_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  payment_method VARCHAR(50) NOT NULL DEFAULT 'efectivo',
  total NUMERIC(10,2) NOT NULL DEFAULT 0,

  CONSTRAINT fk_sale_user
    FOREIGN KEY (user_id)
    REFERENCES public.users (id)
    ON DELETE SET NULL
);

-- Tabla de detalle de ventas (items)
CREATE TABLE public.sale_items (
  id SERIAL PRIMARY KEY,
  sale_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  -- Opcional: unit_cost NUMERIC(10,2) para rastrear el costo en el momento de venta

  CONSTRAINT fk_sale
    FOREIGN KEY (sale_id)
    REFERENCES public.sales (id)
    ON DELETE CASCADE,

  CONSTRAINT fk_product
    FOREIGN KEY (product_id)
    REFERENCES public.products (id)
    ON DELETE SET NULL
);
