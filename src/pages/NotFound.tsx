import { Link } from "react-router-dom";
export default function NotFound() {
  return <div className="card empty-state">Sidan finns inte. <Link to="/">Till startsidan</Link></div>;
}
