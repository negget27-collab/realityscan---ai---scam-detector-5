export type ViewType = 'HOME' | 'INFO' | 'PROFILE' | 'BUSINESS_PANEL';

export type FooterSection = {
  product: { title: string; links: Array<{ label: string; view?: ViewType; external?: boolean; href?: string }> };
  company: { title: string; links: Array<{ label: string; view?: ViewType; external?: boolean; href?: string }> };
  legal: { title: string; links: Array<{ label: string; external?: boolean; href: string }> };
  support: { title: string; links: Array<{ label: string; external?: boolean; href: string }> };
};

export const footerLinks: Record<string, FooterSection> = {
  PT: {
    product: { title: 'Produto', links: [{ label: 'Início', view: 'HOME' }, { label: 'Planos', view: 'INFO' }, { label: 'Créditos', view: 'INFO' }] },
    company: { title: 'Empresa', links: [{ label: 'Centro do Usuário', view: 'PROFILE' }, { label: 'Banco de Dados', view: 'BUSINESS_PANEL' }] },
    legal: { title: 'Legal', links: [{ label: 'Termos de uso', external: true, href: '#' }, { label: 'Privacidade', external: true, href: '#' }] },
    support: { title: 'Suporte', links: [{ label: 'Contato', external: true, href: 'mailto:suporte@realityscan.app' }] },
  },
  EN: {
    product: { title: 'Product', links: [{ label: 'Home', view: 'HOME' }, { label: 'Plans', view: 'INFO' }, { label: 'Credits', view: 'INFO' }] },
    company: { title: 'Company', links: [{ label: 'User Center', view: 'PROFILE' }, { label: 'Database', view: 'BUSINESS_PANEL' }] },
    legal: { title: 'Legal', links: [{ label: 'Terms of use', external: true, href: '#' }, { label: 'Privacy', external: true, href: '#' }] },
    support: { title: 'Support', links: [{ label: 'Contact', external: true, href: 'mailto:support@realityscan.app' }] },
  },
  ES: {
    product: { title: 'Producto', links: [{ label: 'Inicio', view: 'HOME' }, { label: 'Planes', view: 'INFO' }, { label: 'Créditos', view: 'INFO' }] },
    company: { title: 'Empresa', links: [{ label: 'Centro de Usuario', view: 'PROFILE' }, { label: 'Base de Datos', view: 'BUSINESS_PANEL' }] },
    legal: { title: 'Legal', links: [{ label: 'Términos de uso', external: true, href: '#' }, { label: 'Privacidad', external: true, href: '#' }] },
    support: { title: 'Soporte', links: [{ label: 'Contacto', external: true, href: 'mailto:soporte@realityscan.app' }] },
  },
};
