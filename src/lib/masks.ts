export const maskPhone = (value: string): string => {
  if (!value) return '';
  const cleaned = value.replace(/\D/g, '');
  
  if (cleaned.length <= 10) {
    return cleaned.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '');
  }
  return cleaned.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '');
};

export const maskCEP = (value: string): string => {
  if (!value) return '';
  const cleaned = value.replace(/\D/g, '');
  return cleaned.replace(/(\d{5})(\d{0,3})/, '$1-$2').replace(/-$/, '');
};

export const maskCPF = (value: string): string => {
  if (!value) return '';
  const cleaned = value.replace(/\D/g, '');
  return cleaned
    .replace(/(\d{3})(\d{0,3})/, '$1.$2')
    .replace(/(\d{3})\.(\d{3})(\d{0,3})/, '$1.$2.$3')
    .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d{0,2})/, '$1.$2.$3-$4')
    .replace(/-$/, '');
};

export const maskCNPJ = (value: string): string => {
  if (!value) return '';
  const cleaned = value.replace(/\D/g, '');
  return cleaned
    .replace(/(\d{2})(\d{0,3})/, '$1.$2')
    .replace(/(\d{2})\.(\d{3})(\d{0,3})/, '$1.$2.$3')
    .replace(/(\d{2})\.(\d{3})\.(\d{3})(\d{0,4})/, '$1.$2.$3/$4')
    .replace(/(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d{0,2})/, '$1.$2.$3/$4-$5')
    .replace(/-$/, '');
};

export const maskCpfCnpj = (value: string): string => {
  if (!value) return '';
  const cleaned = value.replace(/\D/g, '');
  
  if (cleaned.length <= 11) {
    return maskCPF(value);
  }
  return maskCNPJ(value);
};

export const formatPhone = (phone: string): string => {
  if (!phone) return '-';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  } else if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  return phone;
};

export const formatCpfCnpj = (doc: string): string => {
  if (!doc) return '-';
  const cleaned = doc.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  } else if (cleaned.length === 14) {
    return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  return doc;
};

export const formatCEP = (cep: string): string => {
  if (!cep) return '-';
  const cleaned = cep.replace(/\D/g, '');
  if (cleaned.length === 8) {
    return cleaned.replace(/(\d{5})(\d{3})/, '$1-$2');
  }
  return cep;
};
