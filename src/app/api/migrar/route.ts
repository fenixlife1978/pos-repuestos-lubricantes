import { NextResponse } from 'next/server';
import { migrarEstructura } from '@/lib/migracion-firestore';

export async function GET() {
  try {
    const resultado = await migrarEstructura();
    
    if (resultado.success) {
      return NextResponse.json({
        success: true,
        message: '✅ Migración completada exitosamente',
        resultados: resultado.resultados
      });
    } else {
      return NextResponse.json({
        success: false,
        error: resultado.error
      }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: String(error)
    }, { status: 500 });
  }
}
