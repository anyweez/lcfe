/**
 * Determines whether an item should be shown in the user interface.
 */
function filter(item) {
	var keep = !("inStore" in item);
	keep = keep && ( !("maps" in item) || !("1" in item.maps) );
	keep = keep && ( ('FlatPhysicalDamageMod' in item.stats) || ('PercentAttackSpeedMod' in item.stats) || ('FlatCritChanceMod' in item.stats) );
		
	return keep
}

/**
 * A hacky variable that I use to try to manage the non-determinism of
 * whether loading screens should show up when an AJAX request is made.
 * 
 * The loading screen should only surface after 100ms and this will
 * hopefully help hide the race condition that exists.
 */
var showLoad = true;

function showLoading() {
	if (showLoad) {
		$("#outputData").addClass("blurWhenLoading");
		$("#loading").css("visibility", "visible");
	} else {
		showLoad = true;
	}
}

function hideLoading() {
	showLoad = false;
	
	$("#outputData").removeClass("blurWhenLoading");
	$("#loading").css("visibility", "hidden");
}

(function() {
    var app = angular.module("BestBuild", []);
    
	app.controller("AppController", function($scope, $http) {
		var itemUrl = "http://ddragon.leagueoflegends.com/cdn/4.20.1/data/en_US/item.json";
		$.ajax(itemUrl, {
			success: function(response) {
				var body = document.querySelector("#outputItems");

				// Clear out the items area, then fill it up with information
				// retrieved from ddragon.
				body.innerHTML = "";
				for (var id in response.data) {
					if (!filter(response.data[id])) continue;
					
					var name = response.data[id].name;
					if (name.length > 25) name = name.substr(0, 25) + "...";
					
					var cost = response.data[id].gold.total;	
					var imgUrl = "http://ddragon.leagueoflegends.com/cdn/4.20.1/img/item/" + response.data[id].image.full;
					
					body.innerHTML += 	"<div class='item' id='item-" + id + "'>" +
						"  <img src='" + imgUrl + "' />" +
						"  <div class='itemInfo'>" + 
						"    <p>" + name + "</p>" +
						"    <p>" + cost + " gold</p>" + 
						"  </div>" +
						"</div>";
				}
				
				/**
				 * Make an initial request using the defaults when the 
				 * item list is ready.
				 */
				$scope.request();
			}
		});

		/**
		 * Add a function that makes a request for optimal items given
		 * a certain gold value and champion name.  
		 */
		$scope.request = function() {		
			console.log("Making remote data request.");
			// If we don't have data back in 100ms, show the loading screen.
			setTimeout(showLoading, 100);
			
			var url = "http://localhost:8088/best/?gold=" +
				$scope.gold + "&champ=" +
				$("#headerChampName").val();
			$.ajax(url, {
				success: function(response) {
					$.each($(".item"), function (index, value) {
						$("#" + value.id).removeClass("active");
					});
					
					if (response.Valid) {
						$("#keeperItems").html("");
						var remainingGold = $scope.gold;
						
						for (var itemIndex in response.Items) {
							console.log(response.Items[itemIndex]);
							// Activate each item.
							$scope.activate(response.Items[itemIndex].Id);
							remainingGold -= response.Items[itemIndex].Cost;
						}
					
						// Update display variables.
						$scope.aa._total = (Math.round(response.Fitness * 10)) / 10.0;
						$scope.aa._baseAttackDamage = Math.round(response.ChampNoItems.AttackDamage * 10) / 10.0;
						$scope.aa._attackDamageDelta = Math.round((response.ChampWItems.AttackDamage - response.ChampNoItems.AttackDamage) * 10) / 10.0;
						
						$scope.aa._baseAttackSpeed = Math.round(response.ChampNoItems.AttackSpeed * 10) / 10.0;
						$scope.aa._attackSpeedDelta = Math.round((response.ChampWItems.AttackSpeed - response.ChampNoItems.AttackSpeed) * 10) / 10.0;
						
						$scope.aa._baseCritStrike = Math.round(response.ChampNoItems.CriticalStrikePct * 10) / 10.0;
						$scope.aa._critStrikeDelta = Math.round((response.ChampWItems.CriticalStrikePct - response.ChampNoItems.CriticalStrikePct) * 10) / 10.0;
						
						$scope.$apply();
					}
					// If not valid, we don't have any data about this
					// combination.
					else {
						$("#keeperItems").html("<i>Unknown champion &amp; gold combination.</i>");
					}
					
					hideLoading();
				}
			});
		};
		
		$scope.activate = function (itemId) {
			$("#item-" + itemId).addClass("active");
			// Move the item to the keeper shelf.
			$("#item-" + itemId).clone().attr('id', '').appendTo("#keeperItems");
		};
		
		/**
		 * Define the object that holds all of the performance stats for
		 * auto-attacks.
		 */
		$scope.aa = {
		   _total: null,
		   total: function() {
			   return (this._total === null) ? "---" : this._total;
		   },
		   // Attack damage values.
		   _baseAttackDamage:  null,
		   baseAttackDamage: function() {
			   return (this._baseAttackDamage === null) ? "---" : this._baseAttackDamage;			   
		   },
		   _attackDamageDelta: null,
		   attackDamageDelta: function() {
   			   return (this._attackDamageDelta === null || this._attackDamageDelta == 0) ? "" : "(+" + this._attackDamageDelta + ")";
		   },
		   // Attack speed values.
		   _baseAttackSpeed: null,
		   baseAttackSpeed: function() {
				return (this._baseAttackSpeed === null) ? "---" : this._baseAttackSpeed;
		   },
		   _attackSpeedDelta: null,
		   attackSpeedDelta: function() {
				return (this._attackSpeedDelta === null || this._attackSpeedDelta == 0) ? "" : "(+" + this._attackSpeedDelta + ")";
		   },
		   // Critical strike values.
		   _baseCritStrike:  null,
		   baseCritStrike: function() {
				return (this._baseCritStrike === null) ? "---" : this._baseCritStrike;
		   },
		   _critStrikeDelta: null,
		   critStrikeDelta: function() {
			   return (this._critStrikeDelta === null || this._critStrikeDelta == 0) ? "" : "(+" + this._critStrikeDelta + ")";
		   }
		};
		
		// The amount of gold that the current query is about.
		$scope.gold = 1200;
		$scope.goldDecr = function() {
			$scope.gold -= 100;
			$scope.request();
		}
		
		$scope.goldIncr = function() {
			$scope.gold += 100;
			$scope.request();
		}
//		$scope.apply();

		/**
		 * Requests a set of available champions that should be rendered
		 * in the autocomplete. Then generate an autocomplete widget
		 * once we have the list of champions.
		 */
		$.ajax("/static/data/champions.json", {
			success: function(data) {
				$("#headerChampName").autocomplete({
					source: data.champions,	
					position: {
						of: $("#headerChampImage")
					},
					open: function() {
						$('.ui-menu').width(462);
					},
					select: function(event, ui) {
						$("#headerChampImage").attr("src", ui.item.img);
						$("#headerChampName").val(ui.item.label);
						
						$scope.request();
						return false; 
					},
				}).autocomplete( "instance" )._renderItem = function( ul, item ) {
					return $( "<li>" )
						.append("<img class='ac-img' src='" + item.img + "' />")
						.append("<span class='ac-txt'>" + item.label + "</span>")
						.appendTo( ul );
				};
			}, // end success function declaration.
		});					
		
		$scope.clearChamp = function() {
			$("#headerChampName").val("");
			$("#headerChampImage").attr("src", "");
		}
	});
	
})();

