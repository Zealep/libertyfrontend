import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ImportTransaction, ImportResult } from '../model/import';
import { CategoryService } from './category.service';

@Injectable({
    providedIn: 'root'
})
export class ImportService {
    private readonly categoryService = inject(CategoryService);

    /**
     * Parsea un archivo CSV y retorna las transacciones
     */
    parseCSV(file: File): Observable<ImportResult> {
        return new Observable(observer => {
            const reader = new FileReader();

            reader.onload = (e: any) => {
                try {
                    const text = e.target.result;
                    const result = this.processCSVText(text);
                    observer.next(result);
                    observer.complete();
                } catch (error) {
                    observer.error(error);
                }
            };

            reader.onerror = (error) => {
                observer.error(error);
            };

            reader.readAsText(file, 'ISO-8859-1'); // Encoding para caracteres especiales de Yape
        });
    }

    /**
     * Procesa el texto CSV y extrae las transacciones
     */
    private processCSVText(text: string): ImportResult {
        const lines = text.split('\n').filter(line => line.trim());
        const transactions: ImportTransaction[] = [];

        // Detectar delimitador (coma o punto y coma)
        const delimiter = this.detectDelimiter(lines[0]);

        // Detectar si es formato Yape
        const isYapeFormat = this.detectYapeFormat(lines[0]);

        // Saltar la primera línea si es encabezado
        const hasHeader = this.detectHeader(lines[0]);
        const startLine = hasHeader ? 1 : 0;

        for (let i = startLine; i < lines.length; i++) {
            const line = lines[i].trim();

            // Saltar líneas vacías o que solo tienen delimitadores
            if (this.isEmptyLine(line, delimiter)) {
                continue;
            }

            let transaction: ImportTransaction | null = null;

            if (isYapeFormat) {
                transaction = this.parseYapeLine(line, delimiter, i + 1);
            } else {
                transaction = this.parseCSVLine(line, delimiter, i + 1);
            }

            if (transaction) {
                transactions.push(transaction);
            }
        }

        return {
            totalRows: transactions.length,
            validRows: transactions.filter(t => t.isValid).length,
            invalidRows: transactions.filter(t => !t.isValid).length,
            transactions
        };
    }

    /**
     * Verifica si una línea está vacía (solo delimitadores)
     */
    private isEmptyLine(line: string, delimiter: string): boolean {
        if (!line || line.trim() === '') {
            return true;
        }

        // Verificar si la línea solo contiene delimitadores y espacios
        const withoutDelimiters = line.replace(new RegExp(`\\${delimiter}`, 'g'), '').trim();
        return withoutDelimiters === '';
    }

    /**
     * Detecta si es formato Yape
     */
    private detectYapeFormat(line: string): boolean {
        const lowerLine = line.toLowerCase();
        return lowerLine.includes('tipo de transacción') ||
               lowerLine.includes('tipo de transacci') ||
               lowerLine.includes('pagaste') ||
               lowerLine.includes('te pagó');
    }

    /**
     * Parsea una línea de formato Yape
     * Formato: Tipo;Origen;Destino;Monto;Mensaje;Fecha;
     */
    private parseYapeLine(line: string, delimiter: string, lineNumber: number): ImportTransaction | null {
        const columns = this.splitCSVLine(line, delimiter);

        if (columns.length < 4) {
            return null;
        }

        const transaction: ImportTransaction = {
            amount: 0,
            description: '',
            type: 'EXPENSE',
            transactionDate: '',
            isValid: false,
            validationErrors: [],
            isEditing: false
        };

        try {
            // Columnas Yape:
            // 0: Tipo de Transacción (PAGASTE, TE PAGÓ)
            // 1: Origen
            // 2: Destino
            // 3: Monto
            // 4: Mensaje
            // 5: Fecha de operación

            const tipo = columns[0]?.trim().toUpperCase() || '';
            const origen = columns[1]?.trim() || '';
            const destino = columns[2]?.trim() || '';
            const montoStr = columns[3]?.trim() || '';
            const mensaje = columns[4]?.trim() || '';
            const fechaStr = columns[5]?.trim() || '';

            // Determinar tipo (PAGASTE = gasto, TE PAGÓ = ingreso)
            if (tipo.includes('PAGASTE')) {
                transaction.type = 'EXPENSE';
                transaction.description = `Pago a ${destino}`;
            } else if (tipo.includes('PAG')) { // TE PAGÓ
                transaction.type = 'INCOME';
                transaction.description = `Recibido de ${origen}`;
            } else {
                transaction.validationErrors?.push(`Tipo de transacción desconocido: ${tipo}`);
                return transaction;
            }

            // Parsear monto (CORREGIDO)
            const amount = this.parseAmount(montoStr);
            if (amount !== null && amount > 0) {
                transaction.amount = amount;
            } else {
                transaction.validationErrors?.push(`Monto inválido: ${montoStr}`);
            }

            // Parsear fecha (formato: DD/MM/YYYY HH:MM:SS)
            const date = this.parseDateYape(fechaStr);
            if (date) {
                transaction.transactionDate = date;
            } else {
                transaction.validationErrors?.push('Fecha inválida');
            }

            // Agregar mensaje como nota si existe
            if (mensaje) {
                transaction.notes = mensaje;
                transaction.description += ` - ${mensaje}`;
            }

            // Referencia: tipo de transacción
            transaction.reference = `Yape - ${tipo}`;

            // Validar
            this.validateTransaction(transaction);

            // Sugerir categoría
            this.suggestCategory(transaction);

            return transaction;

        } catch (error) {
            console.error('Error parseando línea Yape:', error);
            transaction.validationErrors?.push(`Error en línea ${lineNumber}`);
            return transaction;
        }
    }

    /**
     * Parsea fecha de Yape (DD/MM/YYYY HH:MM:SS)
     */
    private parseDateYape(dateStr: string): string | null {
        if (!dateStr) return null;

        // Formato: 17/11/2025 19:16:08
        const match = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/);

        if (match) {
            const day = match[1];
            const month = match[2];
            const year = match[3];
            return `${year}-${month}-${day}`;
        }

        return null;
    }

    /**
     * Detecta el delimitador del CSV (coma o punto y coma)
     */
    private detectDelimiter(line: string): string {
        const commaCount = (line.match(/,/g) || []).length;
        const semicolonCount = (line.match(/;/g) || []).length;
        return semicolonCount > commaCount ? ';' : ',';
    }

    /**
     * Detecta si la primera línea es un encabezado
     */
    private detectHeader(line: string): boolean {
        const lowerLine = line.toLowerCase();
        return lowerLine.includes('fecha') ||
               lowerLine.includes('date') ||
               lowerLine.includes('monto') ||
               lowerLine.includes('amount') ||
               lowerLine.includes('descripcion') ||
               lowerLine.includes('description') ||
               lowerLine.includes('tipo');
    }

    /**
     * Parsea una línea del CSV genérico
     */
    private parseCSVLine(line: string, delimiter: string, lineNumber: number): ImportTransaction | null {
        const columns = this.splitCSVLine(line, delimiter);

        if (columns.length < 3) {
            return null;
        }

        const transaction: ImportTransaction = {
            amount: 0,
            description: '',
            type: 'EXPENSE',
            transactionDate: '',
            isValid: false,
            validationErrors: [],
            isEditing: false
        };

        // Detectar formato automáticamente
        const formats = [
            this.tryFormatDateAmountDescriptionType(columns),
            this.tryFormatDateDescriptionAmount(columns),
            this.tryFormatAmountDateDescription(columns)
        ];

        const validFormat = formats.find(f => f !== null);

        if (validFormat) {
            Object.assign(transaction, validFormat);
            this.validateTransaction(transaction);
            this.suggestCategory(transaction);
        } else {
            transaction.validationErrors?.push(`Línea ${lineNumber}: Formato no reconocido`);
        }

        return transaction;
    }

    /**
     * Divide la línea CSV respetando comillas
     */
    private splitCSVLine(line: string, delimiter: string): string[] {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === delimiter && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }

        result.push(current.trim());

        // Limpiar caracteres especiales y reemplazar caracteres mal codificados
        return result.map(col => col.replace(/^"|"$/g, '').replace(/�/g, 'ó').trim());
    }

    /**
     * Intenta parsear formato: fecha, monto, descripcion, tipo
     */
    private tryFormatDateAmountDescriptionType(columns: string[]): Partial<ImportTransaction> | null {
        if (columns.length < 3) return null;

        const date = this.parseDate(columns[0]);
        const amount = this.parseAmount(columns[1]);

        if (!date || amount === null) return null;

        return {
            transactionDate: date,
            amount: Math.abs(amount),
            description: columns[2] || 'Sin descripción',
            type: columns[3] ? this.parseType(columns[3]) : (amount < 0 ? 'EXPENSE' : 'INCOME'),
            reference: columns[4] || ''
        };
    }

    /**
     * Intenta parsear formato: fecha, descripcion, monto
     */
    private tryFormatDateDescriptionAmount(columns: string[]): Partial<ImportTransaction> | null {
        if (columns.length < 3) return null;

        const date = this.parseDate(columns[0]);
        const amount = this.parseAmount(columns[2]);

        if (!date || amount === null) return null;

        return {
            transactionDate: date,
            description: columns[1] || 'Sin descripción',
            amount: Math.abs(amount),
            type: amount < 0 ? 'EXPENSE' : 'INCOME',
            reference: columns[3] || ''
        };
    }

    /**
     * Intenta parsear formato: monto, fecha, descripcion
     */
    private tryFormatAmountDateDescription(columns: string[]): Partial<ImportTransaction> | null {
        if (columns.length < 3) return null;

        const amount = this.parseAmount(columns[0]);
        const date = this.parseDate(columns[1]);

        if (!date || amount === null) return null;

        return {
            transactionDate: date,
            amount: Math.abs(amount),
            description: columns[2] || 'Sin descripción',
            type: amount < 0 ? 'EXPENSE' : 'INCOME',
            reference: columns[3] || ''
        };
    }

    /**
     * Parsea una fecha en varios formatos
     */
    private parseDate(dateStr: string): string | null {
        if (!dateStr) return null;

        // Formatos soportados: DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY
        const formats = [
            /^(\d{2})\/(\d{2})\/(\d{4})$/,  // DD/MM/YYYY
            /^(\d{4})-(\d{2})-(\d{2})$/,    // YYYY-MM-DD
            /^(\d{2})-(\d{2})-(\d{4})$/     // DD-MM-YYYY
        ];

        for (const format of formats) {
            const match = dateStr.match(format);
            if (match) {
                let year, month, day;

                if (format === formats[0] || format === formats[2]) {
                    // DD/MM/YYYY o DD-MM-YYYY
                    day = match[1];
                    month = match[2];
                    year = match[3];
                } else {
                    // YYYY-MM-DD
                    year = match[1];
                    month = match[2];
                    day = match[3];
                }

                return `${year}-${month}-${day}`;
            }
        }

        return null;
    }

    /**
     * Parsea un monto (CORREGIDO para manejar punto como separador decimal)
     */
    private parseAmount(amountStr: string): number | null {
        if (!amountStr || amountStr.trim() === '') return null;

        try {
            // Remover espacios
            let cleaned = amountStr.trim();

            // Remover símbolos de moneda (S/, $, etc)
            cleaned = cleaned.replace(/^[S\/\$\s]+/, '');

            // Si tiene punto Y coma, el punto es separador de miles y la coma es decimal
            // Ejemplo: 1.234,56 -> 1234.56
            if (cleaned.includes('.') && cleaned.includes(',')) {
                cleaned = cleaned.replace(/\./g, '').replace(',', '.');
            }
            // Si solo tiene coma, la coma es el separador decimal
            // Ejemplo: 1234,56 -> 1234.56
            else if (cleaned.includes(',') && !cleaned.includes('.')) {
                cleaned = cleaned.replace(',', '.');
            }
            // Si solo tiene punto:
            // - Si hay más de un punto, son separadores de miles
            // - Si hay un solo punto, es separador decimal
            else if (cleaned.includes('.')) {
                const dotCount = (cleaned.match(/\./g) || []).length;

                if (dotCount > 1) {
                    // Múltiples puntos = separadores de miles
                    // Ejemplo: 1.234.567 -> 1234567
                    cleaned = cleaned.replace(/\./g, '');
                } else {
                    // Un solo punto = separador decimal
                    // Verificar si es separador decimal o de miles
                    const parts = cleaned.split('.');
                    if (parts[1] && parts[1].length === 3) {
                        // Si hay 3 dígitos después del punto, probablemente es separador de miles
                        // Ejemplo: 1.234 -> 1234
                        cleaned = cleaned.replace('.', '');
                    }
                    // Si hay 1 o 2 dígitos, es separador decimal
                    // Ejemplo: 19.80 -> 19.80 (se mantiene)
                }
            }

            // Parsear el número final
            const amount = parseFloat(cleaned);

            if (isNaN(amount)) {
                console.error('Error parseando monto:', amountStr, '-> cleaned:', cleaned);
                return null;
            }

            return amount;

        } catch (error) {
            console.error('Error parseando monto:', amountStr, error);
            return null;
        }
    }

    /**
     * Parsea el tipo de transacción
     */
    private parseType(typeStr: string): 'INCOME' | 'EXPENSE' {
        const lower = typeStr.toLowerCase();

        if (lower.includes('ingreso') || lower.includes('income') || lower.includes('credito') || lower.includes('pag')) {
            return 'INCOME';
        }

        return 'EXPENSE';
    }

    /**
     * Valida una transacción
     */
    private validateTransaction(transaction: ImportTransaction): void {
        transaction.validationErrors = [];

        if (!transaction.transactionDate) {
            transaction.validationErrors.push('Fecha inválida');
        }

        if (transaction.amount <= 0 || isNaN(transaction.amount)) {
            transaction.validationErrors.push('Monto inválido');
        }

        if (!transaction.description || transaction.description.trim() === '') {
            transaction.validationErrors.push('Descripción vacía');
        }

        transaction.isValid = transaction.validationErrors.length === 0;
    }

    /**
     * Sugiere una categoría basada en la descripción
     */
    private suggestCategory(transaction: ImportTransaction): void {
        const description = transaction.description.toLowerCase();
        const type = transaction.type;

        // Palabras clave para sugerir categorías (específicas de Yape y genéricas)
        const keywords: { [key: string]: string[] } = {
            // Gastos
            'Alimentación': ['inversiones jharfer', 'jharfer', 'carniceria', 'restaurante', 'comida', 'food', 'supermercado', 'market', 'pizza', 'burger', 'izi*distrito', 'el chinito', 'panaderia', 'bodega'],
            'Transporte': ['uber', 'taxi', 'gasolina', 'gas', 'estacionamiento', 'parking', 'peaje', 'movil bus', 'pasaje', 'transporte'],
            'Servicios': ['luz', 'agua', 'internet', 'telefono', 'cable', 'netflix', 'spotify', 'claro', 'distribuidora arias', 'arias', 'movistar', 'entel'],
            'Salud': ['farmacia', 'medico', 'doctor', 'clinica', 'hospital', 'medicina', 'neuronova', 'botica', 'inkafarma'],
            'Entretenimiento': ['cine', 'juego', 'game', 'netflix', 'spotify', 'concert', 'concierto', 'fiesta'],
            'Educación': ['universidad', 'curso', 'libro', 'book', 'colegio', 'escuela', 'capacitacion'],
            'Compras': ['samsung', 'tienda', 'compra', 'shopping', 'ropa', 'zapatos'],
            'Familia': ['paolo', 'pelaez', 'huaman', 'yahaira', 'cinthia'],

            // Ingresos
            'Salario': ['sueldo', 'salario', 'pago', 'nomina', 'salary', 'angel', 'ramos', 'aguinaldo', 'gratificacion'],
            'Ventas': ['venta', 'sale', 'ingreso', 'cobro', 'factura'],
            'Transferencias': ['plin', 'yape', 'recibiste', 'transferencia']
        };

        for (const [category, words] of Object.entries(keywords)) {
            if (words.some(word => description.includes(word))) {
                transaction.suggestedCategory = category;
                break;
            }
        }

        // Si no encontró categoría, asignar una por defecto según el tipo
        if (!transaction.suggestedCategory) {
            transaction.suggestedCategory = type === 'INCOME' ? 'Otros Ingresos' : 'Otros Gastos';
        }
    }
}
