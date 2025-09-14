export interface Menu{
    nombre: string;
    icono?: string;
    url?: string;
    subMenus?: Menu[];
}
