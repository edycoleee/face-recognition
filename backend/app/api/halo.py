# app/api/halo.py
from flask_restx import Namespace, Resource, fields
from services.halo_service import get_halo, post_halo

api = Namespace("halo", description="Halo API")

# # Jika pakai input form(form-data) di swagger 
# post_parser = api.parser()
# post_parser.add_argument('nama', location='form', type=str, required=True)
# post_parser.add_argument('handphone', location='form', type=str, required=True)

# Jika pakai payload json langsung di swagger
post_model = api.model("HaloPost", {
    "nama": fields.String(required=True, example='Edy'),
    "handphone": fields.String(required=True, example='08111111')
})

@api.route("/")
class HaloResource(Resource):

    def get(self):
        return get_halo()

    # @api.expect(post_parser)
    # def post(self):
    #     args = post_parser.parse_args()
    #     payload = {
    #         "nama": args["nama"],
    #         "handphone": args["handphone"]
    #     }
    #     return post_halo(payload)

    @api.expect(post_model)
    def post(self):
        payload = api.payload
        return post_halo(payload)