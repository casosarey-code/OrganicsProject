import re

# Read the file
with open('/opt/backend/src/routes/productoComposicion.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# New GET endpoint code
new_code = '''// GET - Listar todas las composiciones (opcionalmente filtrar por empresa)
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { empresaId } = req.query;
    const empresaNum = empresaId ? parseInt(empresaId as string) : null;
    
    let composiciones;
    
    if (empresaNum) {
      const composicionesEmpresa = await prisma.productoComposicion.findMany({
        where: { PCEmpresa: empresaNum },
        include: {
          producto: { select: { ProductoID: true, ProductoNombre: true, ProductoActivo: true } },
          componente: { select: { ProductoID: true, ProductoNombre: true, ProductoActivo: true } },
        },
        orderBy: { PCID: 'desc' },
      });
      
      if (composicionesEmpresa.length > 0) {
        composiciones = composicionesEmpresa;
      } else {
        composiciones = await prisma.productoComposicion.findMany({
          where: { PCEmpresa: null },
          include: {
            producto: { select: { ProductoID: true, ProductoNombre: true, ProductoActivo: true } },
            componente: { select: { ProductoID: true, ProductoNombre: true, ProductoActivo: true } },
          },
          orderBy: { PCID: 'desc' },
        });
      }
    } else {
      composiciones = await prisma.productoComposicion.findMany({
        include: {
          producto: { select: { ProductoID: true, ProductoNombre: true, ProductoActivo: true } },
          componente: { select: { ProductoID: true, ProductoNombre: true, ProductoActivo: true } },
        },
        orderBy: { PCID: 'desc' },
      });
    }
    
    res.json(composiciones);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al listar composiciones' });
  }
});'''

# Pattern to match the entire GET function
pattern = r'// GET - Listar todas las composiciones.*?res\.status\(500\)\.json\(\{ error: \'Error al listar composiciones\' \}\);'
content = re.sub(pattern, new_code, content, flags=re.DOTALL)

with open('/opt/backend/src/routes/productoComposicion.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print('Done!')
