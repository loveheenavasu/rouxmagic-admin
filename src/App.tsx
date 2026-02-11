import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useAuthStore } from "./stores/authStore";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Home from "./pages/home";
import HomeCarousel from "./pages/home/HomeCarousel";
import Watch from "./pages/watch";
import WatchCarousel from "./pages/watch/WatchCarousal";
import Recipes from "./pages/recipes";
import RecipesCarousel from "./pages/recipes/RecipesCarousel";
import Shop from "./pages/Shop";
import Listen from "./pages/Listen";
import Read from "./pages/Read";
import Archive from "./pages/Archive";
import Footer from "./pages/Footer";
import ContentRows from "./pages/ContentRows";

function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route
          path="/login"
          element={
            isAuthenticated ? <Navigate to="/home" replace /> : <Login />
          }
        />

        {/* Protected Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Navigate to="/home" replace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <Layout>
                <Home />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/home/carousel"
          element={
            <ProtectedRoute>
              <Layout>
                <HomeCarousel />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/watch"
          element={
            <ProtectedRoute>
              <Layout>
                <Watch />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/watch/carousel"
          element={
            <ProtectedRoute>
              <Layout>
                <WatchCarousel />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/recipes"
          element={
            <ProtectedRoute>
              <Layout>
                <Recipes />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/recipes/carousel"
          element={
            <ProtectedRoute>
              <Layout>
                <RecipesCarousel />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/listen"
          element={
            <ProtectedRoute>
              <Layout>
                <Listen />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/read"
          element={
            <ProtectedRoute>
              <Layout>
                <Read />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/shop"
          element={
            <ProtectedRoute>
              <Layout>
                <Shop />
              </Layout>
            </ProtectedRoute>
          }
        />
        {/* <Route
          path="/chapters"
          element={
            <ProtectedRoute>
              <Layout>
                <Chapters />
              </Layout>
            </ProtectedRoute>
          }
        /> */}
        <Route
          path="/footer"
          element={
            <ProtectedRoute>
              <Layout>
                <Footer />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/content-rows"
          element={
            <ProtectedRoute>
              <Layout>
                <ContentRows />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/archive"
          element={
            <ProtectedRoute>
              <Layout>
                <Archive />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* 404 Redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
