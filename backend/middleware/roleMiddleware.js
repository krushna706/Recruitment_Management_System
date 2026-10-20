const ExpressError = require("../utils/ExpressError");

// ================== ROLE AUTHORIZATION ==================
// Allow access only to the roles specified by the route.
function roleMiddleware(...allowedRoles) {
    return (req, res, next) => {
        // Authentication must run before role authorization.
        if (!req.user) {
            return next(
                new ExpressError(401, "Please login to continue.")
            );
        }

        if (!allowedRoles.includes(req.user.role)) {
            return next(
                new ExpressError(
                    403,
                    "You do not have permission to access this resource."
                )
            );
        }

        return next();
    };
}

// ================== EXPORTS ==================
module.exports = {
    roleMiddleware,
};