export interface BlockData {
  id: string;
  type: string;
  name: string;
  content: string;
  properties: Record<string, any>;
}

export interface BlockTemplate {
  type: string;
  name: string;
  icon: string;
  category: string;
  defaultContent: string;
  defaultProperties: Record<string, any>;
  editableFields: EditableField[];
}

export interface EditableField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'color' | 'url';
  placeholder?: string;
}
