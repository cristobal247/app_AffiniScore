-- Script para crear la tabla de reflexiones diarias e inicializar el catálogo de frases
-- Puedes ejecutar este script directamente en el SQL Editor de tu consola de Supabase.

CREATE TABLE IF NOT EXISTS public.daily_reflections (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  phrase text NOT NULL,
  author text DEFAULT 'Anónimo',
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT daily_reflections_pkey PRIMARY KEY (id)
);

-- Habilitar RLS (Row Level Security) para seguridad
ALTER TABLE public.daily_reflections ENABLE ROW LEVEL SECURITY;

-- Crear política de lectura pública para todos los usuarios autenticados
CREATE POLICY "Permitir lectura pública a usuarios autenticados" 
  ON public.daily_reflections 
  FOR SELECT 
  TO authenticated 
  USING (true);

-- Limpiar si ya había datos para evitar duplicados en pruebas
TRUNCATE TABLE public.daily_reflections;

-- Insertar un catálogo amplio y hermoso de frases inspiradoras sobre relaciones y crecimiento
INSERT INTO public.daily_reflections (phrase, author) VALUES
('El amor no es algo que se encuentra, es algo que se construye día a día con pequeños gestos de gratitud.', 'Anónimo'),
('La comunicación es el puente entre la confusión y la claridad.', 'Anónimo'),
('Un gran matrimonio no es cuando se junta la pareja perfecta, sino cuando una pareja imperfecta aprende a disfrutar de sus diferencias.', 'Dave Meurer'),
('La empatía es escuchar con los ojos, con las orejas y con el corazón.', 'Anónimo'),
('El amor maduro no es la unión de dos personas incompletas, sino el encuentro de dos seres completos que deciden caminar juntos.', 'Anónimo'),
('Un pequeño gesto de cariño puede sanar un día lleno de tormentas.', 'Anónimo'),
('En el arte del amor, la paciencia es la mayor virtud y el diálogo el mejor camino.', 'Anónimo'),
('Amar es dar a alguien el poder de destruirte, y confiar en que no lo hará.', 'Thomas Hobbes'),
('La calidad de tu relación depende de la calidad de tus conversaciones.', 'Anónimo'),
('El perdón no cambia el pasado, pero engrandece el futuro.', 'Paul Boese'),
('El amor se nutre de la presencia, de la atención sincera y de los pequeños detalles cotidianos.', 'Anónimo'),
('Una buena relación no ocurre por casualidad, requiere tiempo, paciencia y dos personas que realmente quieran estar juntas.', 'Anónimo'),
('Escuchar sin juzgar es el acto de generosidad más grande que puedes ofrecer a quien amas.', 'Anónimo'),
('El amor no consiste en mirarse el uno al otro, sino en mirar juntos en la misma dirección.', 'Antoine de Saint-Exupéry'),
('Las discusiones constructivas no buscan encontrar quién tiene la razón, sino cómo resolver el problema juntos.', 'Anónimo'),
('Un abrazo silencioso a veces dice más que mil palabras de consuelo.', 'Anónimo'),
('El amor verdadero no es la ausencia de dificultades, sino la fuerza para superarlas en equipo.', 'Anónimo'),
('Valorar los pequeños esfuerzos de tu pareja crea un espacio donde el amor florece naturalmente.', 'Anónimo');
