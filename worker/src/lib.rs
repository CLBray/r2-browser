use worker::*;

mod utils;

fn log_request(req: &Request) {
    let coordinates = req.cf()
        .map(|cf| cf.coordinates().unwrap_or_default())
        .unwrap_or_default();
    let region = req.cf()
        .and_then(|cf| cf.region())
        .unwrap_or_else(|| "unknown region".into());
    
    console_log!(
        "{} - [{}], located at: {:?}, within: {}",
        Date::now().as_millis(),
        req.path(),
        coordinates,
        region
    );
}

// Main entry point for ES module format
#[event(fetch)]
pub async fn main(req: Request, env: Env, _ctx: worker::Context) -> Result<Response> {
    log_request(&req);

    // Optionally, get more helpful error messages written to the console in the case of a panic.
    utils::set_panic_hook();

    // Optionally, use the Router to handle matching endpoints, use ":name" placeholders, or "*name"
    // catch-alls to match on specific patterns. Alternatively, use `Router::with_data(D)` to
    // provide arbitrary data that will be accessible in each route via the `ctx.data()` method.
    let router = Router::new();

    // Add some Middleware to handle CORS
    router
        .get("/", |_, _| Response::ok("R2 File Explorer API"))
        .get("/health", |_, _| {
            Response::from_json(&serde_json::json!({
                "status": "healthy",
                "timestamp": chrono::Utc::now().to_rfc3339(),
                "version": env!("CARGO_PKG_VERSION")
            }))
        })
        .run(req, env)
        .await
}