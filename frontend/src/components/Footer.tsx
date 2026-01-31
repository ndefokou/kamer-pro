import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";

const Footer = () => {
    const { t } = useTranslation();

    return (
        <footer className="border-t border-gray-200 bg-gray-50 py-12 mt-16 mb-16 md:mb-0">
            <div className="container mx-auto px-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                    <div>
                        <h3 className="font-semibold text-gray-900 mb-4">{t("footer.sections.assistance.title")}</h3>
                        <ul className="space-y-3 text-sm text-gray-600">
                            <li className="hover:underline cursor-pointer">{t("footer.sections.assistance.helpCenter")}</li>
                            <li className="hover:underline cursor-pointer">{t("footer.sections.assistance.airCover")}</li>
                            <li className="hover:underline cursor-pointer">{t("footer.sections.assistance.safety")}</li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900 mb-4">{t("footer.sections.community.title")}</h3>
                        <ul className="space-y-3 text-sm text-gray-600">
                            <li className="hover:underline cursor-pointer">{t("footer.sections.community.mbokoOrg")}</li>
                            <li className="hover:underline cursor-pointer">{t("footer.sections.community.features")}</li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900 mb-4">{t("footer.sections.hosting.title")}</h3>
                        <ul className="space-y-3 text-sm text-gray-600">
                            <li className="hover:underline cursor-pointer">{t("footer.sections.hosting.tryHosting")}</li>
                            <li className="hover:underline cursor-pointer">{t("footer.sections.hosting.airCoverHost")}</li>
                            <li className="hover:underline cursor-pointer">{t("footer.sections.hosting.resources")}</li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900 mb-4">{t("footer.sections.about.title")}</h3>
                        <ul className="space-y-3 text-sm text-gray-600">
                            <li className="hover:underline cursor-pointer">{t("footer.sections.about.newsroom")}</li>
                            <li className="hover:underline cursor-pointer">{t("footer.sections.about.careers")}</li>
                            <li className="hover:underline cursor-pointer">{t("footer.sections.about.investors")}</li>
                        </ul>
                    </div>
                </div>
                <div className="mt-8 pt-8 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-600">
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-2">
                        <span>{t("footer.bottom.copyright")}</span>
                        <span className="hidden md:inline">·</span>
                        <span className="hover:underline cursor-pointer">{t("footer.bottom.privacy")}</span>
                        <span className="hidden md:inline">·</span>
                        <span className="hover:underline cursor-pointer">{t("footer.bottom.terms")}</span>
                        <span className="hidden md:inline">·</span>
                        <span className="hover:underline cursor-pointer">{t("footer.bottom.sitemap")}</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <button className="flex items-center gap-2 hover:underline">
                            <Globe className="h-4 w-4" />
                            <span>{t("footer.bottom.language")}</span>
                        </button>
                        <span>FCFA</span>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
