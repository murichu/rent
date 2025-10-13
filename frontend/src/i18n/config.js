import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Translation resources
const resources = {
  en: {
    translation: {
      // Navigation
      nav: {
        dashboard: 'Dashboard',
        properties: 'Properties',
        tenants: 'Tenants',
        leases: 'Leases',
        payments: 'Payments',
        maintenance: 'Maintenance',
        settings: 'Settings',
        logout: 'Logout',
      },
      // Common
      common: {
        save: 'Save',
        cancel: 'Cancel',
        delete: 'Delete',
        edit: 'Edit',
        add: 'Add',
        search: 'Search',
        filter: 'Filter',
        export: 'Export',
        import: 'Import',
        loading: 'Loading...',
        noData: 'No data found',
        confirm: 'Confirm',
        yes: 'Yes',
        no: 'No',
      },
      // Dashboard
      dashboard: {
        welcome: 'Welcome back!',
        overview: "Here's what's happening today",
        totalRevenue: 'Total Revenue',
        occupancyRate: 'Occupancy Rate',
        pendingPayments: 'Pending Payments',
        activeLeases: 'Active Leases',
      },
      // Properties
      properties: {
        title: 'Properties',
        addNew: 'Add Property',
        viewAll: 'View All Properties',
        status: {
          available: 'Available',
          occupied: 'Occupied',
          maintenance: 'Maintenance',
          offMarket: 'Off Market',
        },
      },
    },
  },
  es: {
    translation: {
      nav: {
        dashboard: 'Panel',
        properties: 'Propiedades',
        tenants: 'Inquilinos',
        leases: 'Contratos',
        payments: 'Pagos',
        maintenance: 'Mantenimiento',
        settings: 'Configuración',
        logout: 'Cerrar Sesión',
      },
      common: {
        save: 'Guardar',
        cancel: 'Cancelar',
        delete: 'Eliminar',
        edit: 'Editar',
        add: 'Agregar',
        search: 'Buscar',
        filter: 'Filtrar',
        export: 'Exportar',
        import: 'Importar',
        loading: 'Cargando...',
        noData: 'No se encontraron datos',
        confirm: 'Confirmar',
        yes: 'Sí',
        no: 'No',
      },
      dashboard: {
        welcome: '¡Bienvenido de nuevo!',
        overview: 'Esto es lo que está pasando hoy',
        totalRevenue: 'Ingresos Totales',
        occupancyRate: 'Tasa de Ocupación',
        pendingPayments: 'Pagos Pendientes',
        activeLeases: 'Contratos Activos',
      },
      properties: {
        title: 'Propiedades',
        addNew: 'Agregar Propiedad',
        viewAll: 'Ver Todas las Propiedades',
        status: {
          available: 'Disponible',
          occupied: 'Ocupado',
          maintenance: 'Mantenimiento',
          offMarket: 'Fuera del Mercado',
        },
      },
    },
  },
  fr: {
    translation: {
      nav: {
        dashboard: 'Tableau de Bord',
        properties: 'Propriétés',
        tenants: 'Locataires',
        leases: 'Baux',
        payments: 'Paiements',
        maintenance: 'Maintenance',
        settings: 'Paramètres',
        logout: 'Déconnexion',
      },
      common: {
        save: 'Enregistrer',
        cancel: 'Annuler',
        delete: 'Supprimer',
        edit: 'Modifier',
        add: 'Ajouter',
        search: 'Rechercher',
        filter: 'Filtrer',
        export: 'Exporter',
        import: 'Importer',
        loading: 'Chargement...',
        noData: 'Aucune donnée trouvée',
        confirm: 'Confirmer',
        yes: 'Oui',
        no: 'Non',
      },
      dashboard: {
        welcome: 'Bon retour!',
        overview: "Voici ce qui se passe aujourd'hui",
        totalRevenue: 'Revenu Total',
        occupancyRate: "Taux d'Occupation",
        pendingPayments: 'Paiements en Attente',
        activeLeases: 'Baux Actifs',
      },
      properties: {
        title: 'Propriétés',
        addNew: 'Ajouter une Propriété',
        viewAll: 'Voir Toutes les Propriétés',
        status: {
          available: 'Disponible',
          occupied: 'Occupé',
          maintenance: 'Maintenance',
          offMarket: 'Hors Marché',
        },
      },
    },
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: localStorage.getItem('language') || 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
