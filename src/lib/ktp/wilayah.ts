import wilayahData from '@/data/wilayah-indonesia.json'

export interface KabKota {
  code: string
  name: string
}

export interface Province {
  provinceCode: string
  provinceName: string
  kabkota: KabKota[]
}

export const WILAYAH: Province[] = wilayahData as Province[]

export function randomProvince(): Province {
  return WILAYAH[Math.floor(Math.random() * WILAYAH.length)]
}

export function randomKabKota(province: Province): KabKota {
  return province.kabkota[Math.floor(Math.random() * province.kabkota.length)]
}

export function getProvinceByCode(code: string): Province | undefined {
  return WILAYAH.find((p) => p.provinceCode === code)
}
