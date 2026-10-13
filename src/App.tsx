import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AppProvider } from "@/hooks/useApp";
import Layout from "@/components/Layout";
import Recipes from "@/pages/Recipes";
import RecipeEditor from "@/pages/RecipeEditor";
import Lists from "@/pages/Lists";
import ListView from "@/pages/ListView";
import Offers from "@/pages/Offers";
import Products from "@/pages/Products";
import SettingsPage from "@/pages/Settings";
import Admin from "@/pages/Admin";
import Auth from "@/pages/Auth";
import NotFound from "@/pages/NotFound";

export default function App() {
  return (
    <AppProvider>
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
    </AppProvider>
  );
}
