import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";

const Footer = () => {
    const { t } = useTranslation();

    return (
        <footer className="border-t border-gray-200 bg-gray-50 py-12 mt-16 mb-16 md:mb-0">
            <div className="container mx-auto px-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    <div>
                        <h3 className="font-semibold text-gray-900 mb-4">{t("Assistance")}</h3>
                        <ul className="space-y-3 text-sm text-gray-600">
                            <li className="hover:underline cursor-pointer">{t("Centre d'aide")}</li>
                            <li className="hover:underline cursor-pointer">{t("AirCover")}</li>
                            <li className="hover:underline cursor-pointer">{t("Sécurité")}</li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900 mb-4">{t("Communauté")}</h3>
                        <ul className="space-y-3 text-sm text-gray-600">
                            <li className="hover:underline cursor-pointer">{t("mboaMaisson.org")}</li>
                            <li className="hover:underline cursor-pointer">{t("Fonctionnalités")}</li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900 mb-4">{t("Accueil")}</h3>
                        <ul className="space-y-3 text-sm text-gray-600">
                            <li className="hover:underline cursor-pointer">{t("Essayer l'accueil")}</li>
                            <li className="hover:underline cursor-pointer">{t("AirCover pour les hôtes")}</li>
                            <li className="hover:underline cursor-pointer">{t("Ressources")}</li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900 mb-4">MboaMaison</h3>
                        <ul className="space-y-3 text-sm text-gray-600">
                            <li className="hover:underline cursor-pointer">{t("Newsroom")}</li>
                            <li className="hover:underline cursor-pointer">{t("Carrières")}</li>
                            <li className="hover:underline cursor-pointer">{t("Investisseurs")}</li>
                        </ul>
                    </div>
                </div>
                <div className="mt-8 pt-8 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-4">
                        <span>© 2025 MboaMaison, Inc.</span>
                        <span>·</span>
                        <span className="hover:underline cursor-pointer">{t("Confidentialité")}</span>
                        <span>·</span>
                        <span className="hover:underline cursor-pointer">{t("Conditions")}</span>
                        <span>·</span>
                        <span className="hover:underline cursor-pointer">{t("Plan du site")}</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <button className="flex items-center gap-2 hover:underline">
                            <Globe className="h-4 w-4" />
                            <span>{t("English (US)")}</span>
                        </button>
                        <span>FCFA</span>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
