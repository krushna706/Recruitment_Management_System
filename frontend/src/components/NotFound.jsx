import { Link } from "react-router-dom";

function NotFound() {
    return (
        <div className="container text-center py-5">
            <h1>404</h1>
            <p>The page you are looking for does not exist.</p>
            <Link to="/">Go to Home</Link>
        </div>
    );
}

export default NotFound;
