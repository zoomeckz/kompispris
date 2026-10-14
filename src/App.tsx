import { lazyPage } from "@/lib/lazyPage";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AppProvider } from "@/hooks/useApp";
import { LangProvider } from "@/i18n";
import Layout from "@/components/Layout";
import Recipes from "@/pages/Recipes";
import NotFound from "@/pages/NotFound";

// the start page comes with the app; every other page is downloaded the first time it is opened
const RecipeEditor = lazyPage(() => import("@/pages/RecipeEditor"));
const Lists = lazyPage(() => import("@/pages/Lists"));
const ListView = lazyPage(() => import("@/pages/ListView"));
const Offers = lazyPage(() => import("@/pages/Offers"));
const Products = lazyPage(() => import("@/pages/Products"));
const SettingsPage = lazyPage(() => import("@/pages/Settings"));
const Admin = lazyPage(() => import("@/pages/Admin"));
const Auth = lazyPage(() => import("@/pages/Auth"));

export default function App() {
  return (
    <AppProvider>
      <LangProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Recipes />} />
              <Route path="/recept/:id" element={<RecipeEditor />} />
              <Route path="/listor" element={<Lists />} />
              <Route path="/listor/:id" element={<ListView />} />
              <Route path="/erbjudanden" element={<Offers />} />
              <Route path="/varor" element={<Products />} />
              <Route path="/installningar" element={<SettingsPage />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/logga-in" element={<Auth />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </LangProvider>
    </AppProvider>
  );
}
