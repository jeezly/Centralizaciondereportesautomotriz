package Rest;

import Controller.controllerLogin;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

@Path("login")
public class RestLogin {
    private final controllerLogin ctrl = new controllerLogin();

    @POST
    @Produces(MediaType.APPLICATION_JSON)
    @Consumes(MediaType.APPLICATION_JSON)
    public Response login(String json) {
        return ctrl.login(json);
    }

    @GET
    @Path("verifyToken")
    @Produces(MediaType.APPLICATION_JSON)
    public Response verifyToken(
            @QueryParam("idUsuario") int idUsuario,
            @QueryParam("token") String token) {
        return ctrl.verifyToken(idUsuario, token);
    }

    @POST
    @Path("logout")
    @Produces(MediaType.APPLICATION_JSON)
    public Response logout(@QueryParam("idUsuario") int idUsuario) {
        return ctrl.logout(idUsuario);
    }
}