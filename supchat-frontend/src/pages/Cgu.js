// src/pages/Cgu.js
import React from 'react';
import './Cgu.css';

export default function Terms() {
    return (
        <div className="terms-container">
            {/* CGU */}
            <h1>Conditions Générales d’Utilisation (CGU)</h1>

            <p>
                Les présentes Conditions Générales d’Utilisation (ci-après « CGU ») régissent
                l’accès et l’utilisation de la plateforme SupChat, service en ligne de messagerie
                et de collaboration à destination exclusive des entreprises.
            </p>

            <h2>1. Objet</h2>
            <p>
                SupChat met à disposition des utilisateurs inscrits (ci-après « Vous ») un ensemble
                d’outils de communication (chat, partage de fichiers, notifications) accessibles
                via l’URL <code>https://www.supchat.info</code> ou vos sous-domaines dédiés.
            </p>

            <h2>2. Acceptation des CGU</h2>
            <p>
                En cochant la case d’acceptation et en validant votre inscription, Vous reconnaissez
                avoir pris connaissance et accepter sans réserve les présentes CGU. Si Vous n’y
                consentez pas, Vous ne devez pas utiliser SupChat.
            </p>

            <h2>3. Accès au service</h2>
            <p>
                <strong>Inscription et vérification&nbsp;:</strong> l’envoi d’un e-mail de vérification
                est requis. Seuls les comptes activés peuvent se connecter.
                <strong>Identifiants&nbsp;:</strong> Vous êtes responsable de la confidentialité de vos
                identifiants. Toute utilisation de votre compte vous est imputée.
            </p>

            <h2>4. Utilisation autorisée</h2>
            <ul>
                <li>Communication interne et externe propre à votre entreprise.</li>
                <li>Partage de documents autorisés par votre entreprise.</li>
            </ul>
            <p>
                Toute utilisation illégale, diffamatoire, ou contraire aux bonnes mœurs est strictement
                interdite et pourra entraîner la suspension immédiate de votre compte.
            </p>

            <h2>5. Propriété intellectuelle</h2>
            <p>
                Tous les contenus (textes, logos, icônes, code…) présents sur SupChat sont protégés
                par le droit d’auteur et/ou les droits de propriété intellectuelle. Vous ne pouvez ni
                reproduire, ni diffuser, ni modifier ces contenus sans autorisation écrite préalable
                de SupChat.
            </p>

            <h2>6. Responsabilités</h2>
            <p>
                SupChat s’efforce de fournir un service de qualité, disponible 24/7, mais ne saurait
                être tenu responsable des interruptions de service, pannes, erreurs ou pertes de
                données liées à Internet ou à votre propre infrastructure.
            </p>

            <h2>7. Modification des CGU</h2>
            <p>
                SupChat se réserve le droit de mettre à jour ces CGU à tout moment. Les nouvelles
                CGU seront publiées sur cette page avec une date de « Dernière mise à jour ». En
                cas de désaccord, Vous devez cesser immédiatement toute utilisation du service.
            </p>

            {/* RGPD / Politique de Confidentialité */}
            <h1>Politique de Confidentialité &amp; RGPD</h1>

            <h2>1. Responsable du traitement</h2>
            <p>
                Le responsable de la collecte et du traitement de vos données est&nbsp;:
                <strong>SupChat</strong>,
                contact : <a href="mailto:contact@supchat.info">contact@supchat.info</a>
                Siège social : 10 rue de l’Entreprise, 75000 Paris, France.
            </p>

            <h2>2. Données collectées</h2>
            <ul>
                <li><strong>Identifiants et contact</strong> : nom, email, mot de passe (haché).</li>
                <li><strong>Données d’usage</strong> : date de connexion, logs, historiques de chat.</li>
                <li><strong>Données techniques</strong> : adresse IP, type de navigateur, cookies.</li>
            </ul>

            <h2>3. Finalités du traitement</h2>
            <p>
                Vos données sont utilisées pour :
            </p>
            <ul>
                <li>Gérer votre compte, authentification et sécurité.</li>
                <li>Garantir le fonctionnement de la plateforme et la qualité de service.</li>
                <li>Vous envoyer des emails de notifications ou de support.</li>
                <li>Études statistiques et amélioration continue du service (données anonymisées).</li>
            </ul>

            <h2>4. Bases légales</h2>
            <p>
                Nous traitons vos données sur la base de :
            </p>
            <ul>
                <li>L’exécution du contrat de service que Vous avez conclu avec SupChat.</li>
                <li>Votre consentement explicite (case à cocher) pour l’envoi de communications.</li>
                <li>Notre intérêt légitime à maintenir la sécurité et la performance de la plateforme.</li>
            </ul>

            <h2>5. Destinataires des données</h2>
            <p>
                Vos données sont accessibles aux services internes de SupChat et à nos sous-traitants
                techniques (hébergeur, services d’emailing, CDN) uniquement pour les finalités
                décrites. Nous ne vendons ni ne louons jamais vos données à des tiers.
            </p>

            <h2>6. Durée de conservation</h2>
            <ul>
                <li>Comptes inactifs : suppression automatique après 24 mois d’inactivité.</li>
                <li>Données de connexion et logs : conservés 13 mois maximum.</li>
                <li>Messages et fichiers : conservés tant que votre compte est actif, puis archivés 6 mois avant suppression.</li>
            </ul>

            <h2>7. Vos droits</h2>
            <p>
                Conformément au RGPD, vous disposez des droits suivants :
            </p>
            <ul>
                <li><strong>Accès</strong> à vos données personnelles.</li>
                <li><strong>Rectification</strong> de données inexactes.</li>
                <li><strong>Effacement</strong> (« droit à l’oubli »).</li>
                <li><strong>Limitation</strong> du traitement.</li>
                <li><strong>Portabilité</strong> des données.</li>
                <li><strong>Opposition</strong> au traitement.</li>
            </ul>
            <p>
                Pour exercer ces droits, écrivez-nous à :
                <a href="mailto:contact@supchat.info">contact@supchat.info</a>
                ou par courrier à l’adresse ci-dessus.
            </p>

            <h2>8. Cookies</h2>
            <p>
                Nous utilisons des cookies de session et analytiques (Google Analytics) pour :
            </p>
            <ul>
                <li>Améliorer l’expérience utilisateur.</li>
                <li>Suivre la performance et détecter les anomalies.</li>
            </ul>
            <p>
                Vous pouvez gérer/refuser les cookies via les paramètres de votre navigateur.
            </p>

            <h2>9. Sécurité</h2>
            <p>
                Nous mettons en œuvre des mesures techniques (chiffrement TLS 1.2+, pare-feu,
                hachage des mots de passe) et organisationnelles pour garantir la confidentialité,
                l’intégrité et la disponibilité de vos données.
            </p>

            <h2>10. Transferts hors UE</h2>
            <p>
                Vos données sont hébergées au sein de l’Union Européenne. En cas de recours à un
                prestataire hors UE, nous nous assurons de la mise en place de garanties appropriées
                (clauses contractuelles types, Privacy Shield…).
            </p>

            <h2>11. Mises à jour de la politique</h2>
            <p>
                Cette Politique de Confidentialité peut être mise à jour. La date de « Dernière mise à jour »
                est indiquée en tête de page. Nous vous invitons à la consulter régulièrement.
            </p>

            <p className="terms-footer">
                <em>Dernière mise à jour : 11/05/2025</em>
            </p>
        </div>
    );
}
