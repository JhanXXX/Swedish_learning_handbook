import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useLang } from "./hooks/useLang";
import Nav from "./components/Nav";
import Home from "./pages/Home";
import Flashcards from "./pages/Flashcards";
import Quiz from "./pages/Quiz";
import Search from "./pages/Search";
import Progress from "./pages/Progress";
import AiChat from "./pages/AiChat";
import Handbook from "./pages/Handbook";

export default function App() {
  const { lang, setLang, tr } = useLang();

  return (
    <BrowserRouter basename="/swedish-handbook">
      <div className="layout">
        <Nav lang={lang} setLang={setLang} tr={tr} />
        <main style={{ flex: 1 }}>
          <Routes>
            <Route path="/" element={<Home tr={tr} />} />
            <Route path="/flashcards" element={<Flashcards tr={tr} />} />
            <Route path="/quiz" element={<Quiz tr={tr} />} />
            <Route path="/search" element={<Search tr={tr} />} />
            <Route path="/progress" element={<Progress tr={tr} />} />
            <Route path="/ai-chat" element={<AiChat tr={tr} />} />
            <Route path="/handbook" element={<Handbook tr={tr} />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
